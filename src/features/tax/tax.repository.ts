import "server-only";

import { SupabaseDatabaseError } from "@/features/database/database.errors";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import { getRepositoryProvider } from "@/features/repositories/repository.config";

import {
  DEFAULT_TAX_SETTINGS,
  type TaxSettings,
  type TaxSettingsState,
} from "./tax.types";

type TaxGlobal = typeof globalThis & { __ofissioTaxSettings?: TaxSettings };
const taxGlobal = globalThis as TaxGlobal;
taxGlobal.__ofissioTaxSettings ??= { ...DEFAULT_TAX_SETTINGS };

export async function readTaxSettings(): Promise<TaxSettingsState> {
  if (getRepositoryProvider() === "mock") {
    return {
      settings: clone(taxGlobal.__ofissioTaxSettings!),
      source: "mock",
      schemaReady: true,
    };
  }

  const client = getSupabaseAdminClient();
  if (!client) return fallbackState();

  try {
    const rows = await client.select("tax_settings", {
      filters: { id: "default" },
      limit: 1,
    });
    return {
      settings: rows[0] ? rowToSettings(rows[0]) : clone(DEFAULT_TAX_SETTINGS),
      source: "supabase",
      schemaReady: true,
    };
  } catch (error) {
    if (error instanceof SupabaseDatabaseError) return fallbackState();
    throw error;
  }
}

export async function writeTaxSettings(
  patch: Pick<TaxSettings, "enabled" | "rate" | "label">,
): Promise<TaxSettingsState> {
  const next: TaxSettings = {
    id: "default",
    enabled: patch.enabled,
    rate: normalizeTaxRate(patch.rate),
    label: patch.label.trim() || "PPN",
    calculationBasis: "after_discount",
    updatedAt: new Date().toISOString(),
  };

  if (getRepositoryProvider() === "mock") {
    taxGlobal.__ofissioTaxSettings = clone(next);
    return { settings: clone(next), source: "mock", schemaReady: true };
  }

  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabase tax settings belum dikonfigurasi.");
  const existing = await client.select("tax_settings", {
    filters: { id: "default" },
    limit: 1,
  });
  const row = settingsToRow(next);
  if (existing[0]) await client.update("tax_settings", row, { id: "default" });
  else await client.insert("tax_settings", { id: "default", ...row, created_at: next.updatedAt });
  return readTaxSettings();
}

function fallbackState(): TaxSettingsState {
  return {
    settings: clone(DEFAULT_TAX_SETTINGS),
    source: "fallback",
    schemaReady: false,
  };
}

function rowToSettings(row: Record<string, unknown>): TaxSettings {
  return {
    id: "default",
    enabled: row.enabled !== false,
    rate: normalizeTaxRate(row.rate),
    label: String(row.label ?? "PPN").trim() || "PPN",
    calculationBasis: "after_discount",
    updatedAt: String(row.updated_at ?? DEFAULT_TAX_SETTINGS.updatedAt),
  };
}

function settingsToRow(settings: TaxSettings) {
  return {
    enabled: settings.enabled,
    rate: settings.rate,
    label: settings.label,
    calculation_basis: settings.calculationBasis,
    updated_at: settings.updatedAt,
  };
}

function normalizeTaxRate(value: unknown) {
  const rate = Number(value);
  if (!Number.isFinite(rate)) return DEFAULT_TAX_SETTINGS.rate;
  return Math.min(100, Math.max(0, Math.round(rate * 100) / 100));
}

function clone(settings: TaxSettings): TaxSettings {
  return { ...settings };
}
