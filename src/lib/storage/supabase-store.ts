import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { MAX_CHAT_TURNS } from "@/lib/limits";
import type { Personality } from "@/lib/personalities";
import type { ChatTurn, Delivery, DeliveryStore, TurnResult } from "@/lib/storage/types";

type Row = {
  id: string;
  sender_name: string;
  message: string;
  personality: Personality;
  suit_color: string;
  visor_color: string;
  accent_color: string;
  chat_count: number;
  replies: ChatTurn[] | null;
  created_at: string;
};

function fromRow(row: Row): Delivery {
  return {
    id: row.id,
    senderName: row.sender_name,
    message: row.message,
    personality: row.personality,
    colors: {
      suit: row.suit_color,
      visor: row.visor_color,
      accent: row.accent_color,
    },
    createdAt: row.created_at,
    chatCount: row.chat_count,
    replies: Array.isArray(row.replies) ? row.replies : [],
  };
}

export function createSupabaseStore(): DeliveryStore {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env vars are missing.");
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async create(input) {
      const id = randomBytes(9).toString("base64url");
      const { data, error } = await client
        .from("deliveries")
        .insert({
          id,
          sender_name: input.senderName,
          message: input.message,
          personality: input.personality,
          suit_color: input.colors.suit,
          visor_color: input.colors.visor,
          accent_color: input.colors.accent,
          chat_count: 0,
          replies: [],
        })
        .select("*")
        .single();
      if (error || !data) throw new Error("Could not save the delivery.");
      return fromRow(data as Row);
    },
    async get(id) {
      const { data, error } = await client.from("deliveries").select("*").eq("id", id).maybeSingle();
      if (error || !data) return null;
      return fromRow(data as Row);
    },
    async addUserTurn(id, content) {
      return addUser(client, id, content);
    },
    async addAssistantTurn(id, content) {
      if (!content.trim()) return;
      const delivery = await this.get(id);
      if (!delivery) return;
      const replies = [...delivery.replies, { role: "assistant" as const, content, at: new Date().toISOString() }].slice(-40);
      await client.from("deliveries").update({ replies }).eq("id", id);
    },
  };
}

async function addUser(client: SupabaseClient, id: string, content: string): Promise<TurnResult> {
  const { data, error } = await client.from("deliveries").select("*").eq("id", id).maybeSingle();
  if (error || !data) return { ok: false, reason: "missing" };
  const delivery = fromRow(data as Row);
  if (delivery.chatCount >= MAX_CHAT_TURNS) {
    return { ok: false, reason: "limited", delivery };
  }
  const replies = [
    ...delivery.replies,
    { role: "user" as const, content, at: new Date().toISOString() },
  ].slice(-40);
  const { data: updated, error: updateError } = await client
    .from("deliveries")
    .update({ chat_count: delivery.chatCount + 1, replies })
    .eq("id", id)
    .eq("chat_count", delivery.chatCount)
    .select("*")
    .maybeSingle();
  if (updateError || !updated) {
    const again = await client.from("deliveries").select("*").eq("id", id).maybeSingle();
    if (!again.data) return { ok: false, reason: "missing" };
    const current = fromRow(again.data as Row);
    if (current.chatCount >= MAX_CHAT_TURNS) return { ok: false, reason: "limited", delivery: current };
    return { ok: false, reason: "limited", delivery: current };
  }
  return { ok: true, delivery: fromRow(updated as Row) };
}
