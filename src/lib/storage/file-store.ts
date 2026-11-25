import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { MAX_CHAT_TURNS } from "@/lib/limits";
import { createMemoryStore } from "@/lib/storage/memory-store";
import type { ChatTurn, Delivery, DeliveryStore, TurnResult } from "@/lib/storage/types";

type FileDb = { deliveries: Record<string, Delivery> };

const FILE = path.join(process.cwd(), "data", "deliveries.json");

const globalFile = globalThis as typeof globalThis & {
  __payloadFileQueue?: Promise<unknown>;
  __payloadFileBroken?: boolean;
};

function lock<T>(fn: () => Promise<T>): Promise<T> {
  const previous = globalFile.__payloadFileQueue ?? Promise.resolve();
  const run = previous.then(fn, fn);
  globalFile.__payloadFileQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function load(): Promise<FileDb> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as FileDb;
    if (!parsed || typeof parsed !== "object" || !parsed.deliveries) {
      return { deliveries: {} };
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { deliveries: {} };
    }
    throw error;
  }
}

async function save(data: FileDb) {
  await mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(data));
  await rename(tmp, FILE);
}

function newId(): string {
  return randomBytes(9).toString("base64url");
}

export function createFileStore(): DeliveryStore {
  const memory = createMemoryStore();

  async function withDb<T>(fn: (data: FileDb) => Promise<T> | T): Promise<T> {
    if (globalFile.__payloadFileBroken) {
      throw new Error("file-store-disabled");
    }
    return lock(async () => {
      const data = await load();
      const result = await fn(data);
      await save(data);
      return result;
    });
  }

  return {
    async create(input) {
      try {
        return await withDb(async (data) => {
          const delivery: Delivery = {
            ...input,
            id: newId(),
            createdAt: new Date().toISOString(),
            chatCount: 0,
            replies: [],
          };
          data.deliveries[delivery.id] = delivery;
          return delivery;
        });
      } catch {
        console.error("[payload] file store unavailable, using memory");
        globalFile.__payloadFileBroken = true;
        return memory.create(input);
      }
    },
    async get(id) {
      if (globalFile.__payloadFileBroken) return memory.get(id);
      try {
        const data = await load();
        return data.deliveries[id] ?? null;
      } catch {
        return memory.get(id);
      }
    },
    async addUserTurn(id, content) {
      if (globalFile.__payloadFileBroken) return memory.addUserTurn(id, content);
      try {
        return await withDb((data) => addUser(data, id, content));
      } catch {
        globalFile.__payloadFileBroken = true;
        return memory.addUserTurn(id, content);
      }
    },
    async addAssistantTurn(id, content) {
      if (!content.trim()) return;
      if (globalFile.__payloadFileBroken) {
        await memory.addAssistantTurn(id, content);
        return;
      }
      try {
        await withDb((data) => {
          const delivery = data.deliveries[id];
          if (!delivery) return;
          push(delivery, { role: "assistant", content, at: new Date().toISOString() });
        });
      } catch {
        globalFile.__payloadFileBroken = true;
        await memory.addAssistantTurn(id, content);
      }
    },
  };
}

function addUser(data: FileDb, id: string, content: string): TurnResult {
  const delivery = data.deliveries[id];
  if (!delivery) return { ok: false, reason: "missing" };
  if (delivery.chatCount >= MAX_CHAT_TURNS) {
    return { ok: false, reason: "limited", delivery };
  }
  delivery.chatCount += 1;
  push(delivery, { role: "user", content, at: new Date().toISOString() });
  return { ok: true, delivery };
}

function push(delivery: Delivery, turn: ChatTurn) {
  delivery.replies = [...delivery.replies, turn].slice(-40);
}
