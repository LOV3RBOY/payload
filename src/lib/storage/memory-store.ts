import { randomBytes } from "node:crypto";
import { MAX_CHAT_TURNS } from "@/lib/limits";
import type { ChatTurn, Delivery, DeliveryStore, TurnResult } from "@/lib/storage/types";

type MemoryDb = { deliveries: Record<string, Delivery> };

const globalMemory = globalThis as typeof globalThis & {
  __payloadMemory?: MemoryDb;
  __payloadMemoryQueue?: Promise<unknown>;
};

function db(): MemoryDb {
  if (!globalMemory.__payloadMemory) {
    globalMemory.__payloadMemory = { deliveries: {} };
  }
  return globalMemory.__payloadMemory;
}

function lock<T>(fn: () => Promise<T>): Promise<T> {
  const previous = globalMemory.__payloadMemoryQueue ?? Promise.resolve();
  const run = previous.then(fn, fn);
  globalMemory.__payloadMemoryQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function newId(): string {
  return randomBytes(9).toString("base64url");
}

export function createMemoryStore(): DeliveryStore {
  return {
    async create(input) {
      return lock(async () => {
        const delivery: Delivery = {
          ...input,
          id: newId(),
          createdAt: new Date().toISOString(),
          chatCount: 0,
          replies: [],
        };
        db().deliveries[delivery.id] = delivery;
        return delivery;
      });
    },
    async get(id) {
      return db().deliveries[id] ?? null;
    },
    async addUserTurn(id, content) {
      return lock(async () => mutateUser(id, content));
    },
    async addAssistantTurn(id, content) {
      await lock(async () => {
        const delivery = db().deliveries[id];
        if (!delivery || !content.trim()) return;
        pushTurn(delivery, { role: "assistant", content, at: new Date().toISOString() });
      });
    },
  };
}

function mutateUser(id: string, content: string): TurnResult {
  const delivery = db().deliveries[id];
  if (!delivery) return { ok: false, reason: "missing" };
  if (delivery.chatCount >= MAX_CHAT_TURNS) {
    return { ok: false, reason: "limited", delivery };
  }
  delivery.chatCount += 1;
  pushTurn(delivery, { role: "user", content, at: new Date().toISOString() });
  return { ok: true, delivery };
}

function pushTurn(delivery: Delivery, turn: ChatTurn) {
  delivery.replies = [...delivery.replies, turn].slice(-40);
}
