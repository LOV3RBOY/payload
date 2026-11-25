import { isHexColor } from "@/lib/palette";
import { isPersonality, type Personality } from "@/lib/personalities";
import { MAX_CHAT, MAX_MESSAGE, MAX_NAME } from "@/lib/limits";

export type AstronautColors = {
  suit: string;
  visor: string;
  accent: string;
};

export type CreateInput = {
  senderName: string;
  message: string;
  personality: Personality;
  colors: AstronautColors;
};

export function sanitizeText(input: unknown, max: number, newlines = false): string {
  if (typeof input !== "string") return "";
  let text = input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  if (newlines) {
    text = text.replace(/\r\n/g, "\n").replace(/[^\S\n]+/g, " ").replace(/\n{3,}/g, "\n\n");
  } else {
    text = text.replace(/\s+/g, " ");
  }
  return text.trim().slice(0, max);
}

export function parseCreateInput(body: unknown):
  | { ok: true; value: CreateInput }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "That launch request was empty." };
  }
  const record = body as Record<string, unknown>;
  const senderName = sanitizeText(record.senderName, MAX_NAME);
  const message = sanitizeText(record.message, MAX_MESSAGE, true);
  if (!senderName) return { ok: false, error: "Add your name so they know who sent it." };
  if (!message) return { ok: false, error: "Write a message for them to deliver." };
  if (!isPersonality(record.personality)) {
    return { ok: false, error: "Pick a personality." };
  }
  const colors = record.colors;
  if (!colors || typeof colors !== "object") {
    return { ok: false, error: "Pick suit, visor, and accent colors." };
  }
  const palette = colors as Record<string, unknown>;
  if (!isHexColor(palette.suit) || !isHexColor(palette.visor) || !isHexColor(palette.accent)) {
    return { ok: false, error: "Colors need to be hex values like #f4f7fb." };
  }
  return {
    ok: true,
    value: {
      senderName,
      message,
      personality: record.personality,
      colors: {
        suit: palette.suit,
        visor: palette.visor,
        accent: palette.accent,
      },
    },
  };
}

export function parseChatInput(body: unknown):
  | { ok: true; message: string }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Say something first." };
  }
  const message = sanitizeText((body as Record<string, unknown>).message, MAX_CHAT);
  if (!message) return { ok: false, error: "Say something first." };
  return { ok: true, message };
}

const creates = new Map<string, { n: number; reset: number }>();
const chats = new Map<string, { n: number; reset: number }>();

function allow(bucket: Map<string, { n: number; reset: number }>, key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = bucket.get(key);
  if (!current || now > current.reset) {
    bucket.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  if (current.n >= limit) return false;
  current.n += 1;
  return true;
}

export function allowCreate(ip: string): boolean {
  return allow(creates, ip, 30, 60 * 60 * 1000);
}

export function allowChat(ip: string): boolean {
  return allow(chats, ip, 24, 60 * 1000);
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "local";
  return request.headers.get("x-real-ip") ?? "local";
}
