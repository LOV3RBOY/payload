import { createFileStore } from "@/lib/storage/file-store";
import { createSupabaseStore } from "@/lib/storage/supabase-store";
import type { DeliveryStore } from "@/lib/storage/types";

const globalStore = globalThis as typeof globalThis & {
  __payloadStore?: DeliveryStore;
};

export function getStore(): DeliveryStore {
  if (!globalStore.__payloadStore) {
    const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
    globalStore.__payloadStore = hasSupabase ? createSupabaseStore() : createFileStore();
  }
  return globalStore.__payloadStore;
}

export function storageMode(): "supabase" | "file" {
  return process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "file";
}
