// src/features/site-content/site-content.service.ts
//
// Two read paths:
//   - getSiteContent()          → admin, UNCACHED, always reflects latest state.
//   - getPublicSiteContent()    → public, CACHED via unstable_cache (tag
//     "site-content"), consumed directly by the HomePage RSC.
//
// WHY the cache lives HERE (service), not in the repository: the Supabase admin
// client hard-codes `cache:"no-store"` on every fetch (supabase-admin.client),
// so a Next data-cache tag on those fetches would be a no-op. `unstable_cache`
// memoizes the FUNCTION RESULT keyed by tag — independent of fetch mode — so
// this is the layer where the tag actually bites. The PATCH route calls
// `revalidateTag("site-content")` after a successful write, which invalidates
// both this data-cache entry and the Full Route Cache entry for "/", so the
// public homepage reflects the edit on the next request.
//
// `unstable_cache` carries the "unstable" label; when the repo adopts the
// `"use cache"` directive, migrate this wrapper accordingly.

import "server-only";

import { unstable_cache } from "next/cache";

import {
  SECTION_REGISTRY,
  getSectionEntry,
  type PublicSiteContent,
  type SectionKey,
} from "./content.schema";
import {
  readAllSiteContent,
  writeSiteContentSection,
} from "./site-content.repository";
import type { SiteContentPayload } from "./site-content.validation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Resolve the effective data for one section: the DB row if it parses against
 * the section's zod schema, otherwise the registry default. Never throws — a
 * corrupt or shape-mismatched row simply falls back so the homepage keeps
 * rendering (one bad row never takes down the whole page).
 */
function resolveEffectiveData(key: SectionKey, raw: unknown): unknown {
  const entry = getSectionEntry(key);
  if (!entry) return undefined;
  if (raw !== undefined && raw !== null) {
    const parsed = entry.schema.safeParse(raw);
    if (parsed.success) return parsed.data;
  }
  return clone(entry.default);
}

// ---------------------------------------------------------------------------
// Admin read (uncached)
// ---------------------------------------------------------------------------

export interface SiteContentSectionState {
  key: SectionKey;
  label: string;
  description: string;
  /** effective data (DB row if valid, else default) — what the editor shows. */
  data: unknown;
  /** whether a row currently exists in the DB for this section. */
  hasRow: boolean;
}

export interface SiteContentState {
  sections: SiteContentSectionState[];
  source: "supabase" | "mock" | "fallback";
  schemaReady: boolean;
}

export async function getSiteContent(): Promise<SiteContentState> {
  const read = await readAllSiteContent();
  const sections: SiteContentSectionState[] = SECTION_REGISTRY.map((entry) => {
    const raw = read.rows[entry.key];
    return {
      key: entry.key,
      label: entry.label,
      description: entry.description,
      data: resolveEffectiveData(entry.key, raw),
      hasRow: raw !== undefined,
    };
  });
  return { sections, source: read.source, schemaReady: read.schemaReady };
}

// ---------------------------------------------------------------------------
// Public read (cached, tagged "site-content")
// ---------------------------------------------------------------------------

export const getPublicSiteContent = unstable_cache(
  async (): Promise<PublicSiteContent> => {
    const read = await readAllSiteContent();
    const assembled = {} as Record<SectionKey, unknown>;
    for (const entry of SECTION_REGISTRY) {
      assembled[entry.key] = resolveEffectiveData(entry.key, read.rows[entry.key]);
    }
    // Sound cast: every SectionKey maps to its validated-or-defaulted data, and
    // PublicSiteContent's keys mirror SectionKey. Validation guarantees shape.
    return assembled as unknown as PublicSiteContent;
  },
  ["site-content"],
  { tags: ["site-content"] },
);

// ---------------------------------------------------------------------------
// Mutation (route calls revalidateTag after this returns)
// ---------------------------------------------------------------------------

export async function updateSiteContent(
  payload: SiteContentPayload,
  actorId: string | null,
): Promise<{ source: "supabase" | "mock" | "fallback"; schemaReady: boolean }> {
  await writeSiteContentSection(payload.section, payload.data, actorId);
  const read = await readAllSiteContent();
  return { source: read.source, schemaReady: read.schemaReady };
}
