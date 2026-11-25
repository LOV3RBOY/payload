import type { Personality } from "@/lib/personalities";
import type { AstronautColors } from "@/lib/safety";
import { MAX_CHAT_TURNS } from "@/lib/limits";

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  at: string;
};

export type Delivery = {
  id: string;
  senderName: string;
  message: string;
  personality: Personality;
  colors: AstronautColors;
  createdAt: string;
  chatCount: number;
  replies: ChatTurn[];
};

export type PublicDelivery = Delivery & { chatLimit: number };

export type TurnResult =
  | { ok: true; delivery: Delivery }
  | { ok: false; reason: "missing" }
  | { ok: false; reason: "limited"; delivery: Delivery };

export interface DeliveryStore {
  create(input: Omit<Delivery, "id" | "createdAt" | "chatCount" | "replies">): Promise<Delivery>;
  get(id: string): Promise<Delivery | null>;
  addUserTurn(id: string, content: string): Promise<TurnResult>;
  addAssistantTurn(id: string, content: string): Promise<void>;
}

export function toPublic(delivery: Delivery): PublicDelivery {
  return { ...delivery, chatLimit: MAX_CHAT_TURNS };
}

export function isDeliveryId(id: string): boolean {
  return /^[A-Za-z0-9_-]{8,24}$/.test(id);
}
