import "server-only";

import { SupabaseDatabaseError } from "@/features/database/database.errors";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import { getRepositoryProvider } from "@/features/repositories/repository.config";
import { normalizeMoqSettings, type MoqSettings } from "./moq-settings.types";

type MoqState = { settings: MoqSettings; source: "supabase" | "mock" | "fallback"; schemaReady: boolean };
type MoqGlobal = typeof globalThis & { __ofissioMoqSettings?: MoqSettings };
const moqGlobal = globalThis as MoqGlobal;
const mockSettings = moqGlobal.__ofissioMoqSettings ??
  (moqGlobal.__ofissioMoqSettings = normalizeMoqSettings(null));

function rowToSettings(row: Record<string, unknown>): MoqSettings {
  return normalizeMoqSettings({
    fulfillment: row.moq_fulfillment,
    customization: row.moq_customization,
    production: row.moq_production,
    embroidery: row.moq_embroidery,
  });
}

function settingsToRow(settings: MoqSettings) {
  return {
    moq_fulfillment: settings.fulfillment,
    moq_customization: settings.customization,
    moq_production: settings.production,
    moq_embroidery: settings.embroidery,
    updated_at: new Date().toISOString(),
  };
}

export async function readMoqSettings(): Promise<MoqState> {
  if (getRepositoryProvider() === "mock") {
    return { settings: { ...mockSettings }, source: "mock", schemaReady: true };
  }
  const client = getSupabaseAdminClient();
  if (!client) return { settings: { ...mockSettings }, source: "fallback", schemaReady: false };
  try {
    const rows = await client.select("moq_settings", { filters: { id: "global" }, limit: 1 });
    if (!rows[0]) return { settings: { ...mockSettings }, source: "fallback", schemaReady: true };
    return { settings: rowToSettings(rows[0]), source: "supabase", schemaReady: true };
  } catch (error) {
    if (error instanceof SupabaseDatabaseError && error.reason === "relation_does_not_exist") {
      return { settings: { ...mockSettings }, source: "fallback", schemaReady: false };
    }
    throw error;
  }
}

export async function writeMoqSettings(settings: MoqSettings): Promise<MoqState> {
  if (getRepositoryProvider() === "mock") {
    Object.assign(mockSettings, settings);
    return readMoqSettings();
  }
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabase master MOQ belum dikonfigurasi.");
  // Seed row id='global' selalu ada (insert on conflict di migration 029);
  // update ganda sebagai jaring pengaman bila seed dilewati.
  const existing = await client.select("moq_settings", { filters: { id: "global" }, limit: 1 });
  const row = settingsToRow(settings);
  if (existing[0]) await client.update("moq_settings", row, { id: "global" });
  else await client.insert("moq_settings", { id: "global", ...row });
  return readMoqSettings();
}
