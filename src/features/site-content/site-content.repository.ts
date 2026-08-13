// src/features/site-content/site-content.repository.ts
// Data access for admin-editable homepage content. Mirrors the
// global-embroidery-pricing repository: mock store (seeded from the registry
// defaults) vs Supabase; `relation_does_not_exist` is caught and surfaced as
// `schemaReady:false` so the homepage renders from defaults before migration
// 025 is applied. The service layer (not here) merges defaults + validates.
//
// `getSupabaseAdminClient` forces `cache:"no-store"` on every read, so any data
// caching must wrap the SERVICE function (see unstable_cache in
// site-content.service.ts) — not this layer.

import "server-only";

import { SupabaseDatabaseError } from "@/features/database/database.errors";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import { getRepositoryProvider } from "@/features/repositories/repository.config";

import { SECTION_REGISTRY, type SectionKey } from "./content.schema";

export interface SiteContentReadAll {
  /** section key -> raw jsonb data (only sections that have a row). */
  rows: Record<string, unknown>;
  source: "supabase" | "mock" | "fallback";
  schemaReady: boolean;
}

type SiteContentGlobal = typeof globalThis & {
  __ofissioSiteContent?: Map<string, unknown>;
};
const siteContentGlobal = globalThis as SiteContentGlobal;
const mockStore =
  siteContentGlobal.__ofissioSiteContent ??
  (siteContentGlobal.__ofissioSiteContent = seedMockFromDefaults());

function seedMockFromDefaults(): Map<string, unknown> {
  const map = new Map<string, unknown>();
  for (const entry of SECTION_REGISTRY) {
    map.set(entry.key, clone(entry.default));
  }
  return map;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function readAllSiteContent(): Promise<SiteContentReadAll> {
  if (getRepositoryProvider() === "mock") {
    const rows: Record<string, unknown> = {};
    for (const [key, value] of mockStore.entries()) rows[key] = clone(value);
    return { rows, source: "mock", schemaReady: true };
  }
  const client = getSupabaseAdminClient();
  if (!client) return { rows: {}, source: "fallback", schemaReady: false };
  try {
    const rawRows = await client.select("site_content", {
      order: "section.asc",
    });
    const rows: Record<string, unknown> = {};
    for (const row of rawRows) {
      const section = String(row.section ?? "");
      if (section) rows[section] = (row.data ?? {}) as unknown;
    }
    return { rows, source: "supabase", schemaReady: true };
  } catch (error) {
    if (
      error instanceof SupabaseDatabaseError &&
      error.reason === "relation_does_not_exist"
    ) {
      return { rows: {}, source: "fallback", schemaReady: false };
    }
    throw error;
  }
}

export async function writeSiteContentSection(
  key: SectionKey,
  data: unknown,
  actorId: string | null,
): Promise<void> {
  if (getRepositoryProvider() === "mock") {
    mockStore.set(key, clone(data));
    return;
  }
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error("Supabase site_content belum dikonfigurasi.");
  }
  // The admin client has no upsert helper: select-then-update-or-insert, exactly
  // like writeGlobalEmbroideryPricing.
  const existing = await client.select("site_content", {
    filters: { section: key },
    limit: 1,
  });
  const now = new Date().toISOString();
  const patch = { data, updated_at: now, updated_by: actorId };
  if (existing[0]) {
    await client.update("site_content", patch, { section: key });
  } else {
    await client.insert("site_content", { section: key, ...patch });
  }
}
