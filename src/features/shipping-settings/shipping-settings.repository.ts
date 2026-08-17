import "server-only";

import { SupabaseDatabaseError } from "@/features/database/database.errors";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import { getRepositoryProvider } from "@/features/repositories/repository.config";

import type { ShippingSettingsState } from "./shipping-settings.types";

type ShippingGlobal = typeof globalThis & { __ofissioShippingServices?: string[] };
const shippingGlobal = globalThis as ShippingGlobal;
shippingGlobal.__ofissioShippingServices ??= [];

export async function readShippingSettings(): Promise<ShippingSettingsState> {
  if (getRepositoryProvider() === "mock") {
    return state([...shippingGlobal.__ofissioShippingServices!], "mock", true, null);
  }
  const client = getSupabaseAdminClient();
  if (!client) return state([], "fallback", false, null);
  try {
    const rows = await client.select("shipping_settings", { filters: { id: "default" }, limit: 1 });
    if (!rows[0]) return state([], "supabase", true, null);
    const services = Array.isArray(rows[0].enabled_services)
      ? rows[0].enabled_services.filter((value): value is string => typeof value === "string")
      : [];
    return state(services, "supabase", true, String(rows[0].updated_at ?? ""));
  } catch (error) {
    if (error instanceof SupabaseDatabaseError) return state([], "fallback", false, null);
    throw error;
  }
}

export async function writeShippingSettings(enabledServices: string[], actorId: string) {
  const normalized = [...new Set(enabledServices.map((value) => value.toLowerCase()))].sort();
  if (getRepositoryProvider() === "mock") {
    shippingGlobal.__ofissioShippingServices = normalized;
    return state(normalized, "mock", true, new Date().toISOString());
  }
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabase shipping settings belum dikonfigurasi.");
  const now = new Date().toISOString();
  const existing = await client.select("shipping_settings", { filters: { id: "default" }, limit: 1 });
  const row = { enabled_services: normalized, updated_at: now, updated_by: actorId };
  if (existing[0]) await client.update("shipping_settings", row, { id: "default" });
  else await client.insert("shipping_settings", { id: "default", ...row });
  return state(normalized, "supabase", true, now);
}

function state(enabledServices: string[], source: ShippingSettingsState["source"], schemaReady: boolean, updatedAt: string | null): ShippingSettingsState {
  return { enabledServices, source, schemaReady, updatedAt };
}
