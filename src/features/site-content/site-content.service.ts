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
import { SupabaseDatabaseError } from "@/features/database/database.errors";

import {
  SECTION_REGISTRY,
  SITE_CONTENT_SECTION_KEYS,
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
 * Stable signature of the registry's DEFAULT payloads. Object-literal key order
 * is deterministic for a given build, so this changes exactly when a section's
 * default data (or its field set, through defaulted fields) changes — used as a
 * unstable_cache keyPart so shape changes invalidate stale cached results.
 */
function siteContentDefaultsSignature(): string {
  const serialized = JSON.stringify(SECTION_REGISTRY.map((entry) => [entry.key, entry.default]));
  let hash = 0;
  for (let i = 0; i < serialized.length; i++) {
    hash = (Math.imul(31, hash) + serialized.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
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

function assemblePublicSiteContent(rows: Record<string, unknown>): PublicSiteContent {
  const assembled = {} as Record<SectionKey, unknown>;
  for (const entry of SECTION_REGISTRY) {
    assembled[entry.key] = resolveEffectiveData(entry.key, rows[entry.key]);
  }
  return assembled as unknown as PublicSiteContent;
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
    try {
      const read = await readAllSiteContent();
      return assemblePublicSiteContent(read.rows);
    } catch (error) {
      // Public pages must remain available during a temporary Supabase outage.
      // The admin read path intentionally still throws, so operators can see
      // that persisted content is unavailable instead of unknowingly editing
      // defaults. The client already logs the internal database error safely.
      if (error instanceof SupabaseDatabaseError) {
        return assemblePublicSiteContent({});
      }
      throw error;
    }
  },
  // The keyParts MUST carry a registry-shape signature. The function body above
  // is shape-agnostic (it iterates SECTION_REGISTRY generically), so its source
  // hash is unchanged when sections are added or removed — which means a result
  // persisted under the old key (e.g. a 3-section Phase-1 object) would keep
  // being served after the registry grew, silently missing every new section.
  // The section count covers membership changes; the defaults signature below
  // additionally covers FIELD/shape changes to a section (e.g. IndustriTile
  // gaining `photo`), which leave the count untouched but change what a fresh
  // fallback computes — without it, a pre-change entry keeps being served in
  // both dev and production until a manual revalidateTag.
  ["site-content-v2", `sections:${SITE_CONTENT_SECTION_KEYS.length}`, `shape:${siteContentDefaultsSignature()}`],
  {
    tags: ["site-content"],
    // Admin saves still invalidate immediately. This short backstop also keeps
    // separate local/VPS instances from retaining an old content snapshot
    // indefinitely when another process performed the write.
    revalidate: 60,
  },
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
