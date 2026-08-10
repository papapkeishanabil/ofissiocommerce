// src/lib/ofistant/ofistant.service.ts
// The single entry point the UI calls to "talk to Ofistant".
//
// Today: it runs the rule-based engine. Tomorrow (Phase 7): swap the body of
// `respond()` to call an LLM with tool-calling — the return type stays the
// same (OfistantResponse), so the UI/dispatcher never change.

import { ofistantActionSchema, type OfistantAction } from "./ofistant.actions";
import { runRules } from "./ofistant.rules";
import { mergePatch, withCartSummary } from "./ofistant.context";
import type { OfistantContext, OfistantResponse } from "./ofistant.types";
import { DEFAULT_PUBLIC_TAXONOMY } from "@/features/catalog-taxonomy/catalog-taxonomy.defaults";
import type {
  CatalogSearchResult,
  PublicCatalogTaxonomy,
} from "@/features/catalog-taxonomy/catalog-taxonomy.types";

export interface RespondInput {
  text: string;
  ctx: OfistantContext;
  cart: {
    itemCount: number;
    totalQty: number;
    totalEstimatedPrice: number;
  };
  taxonomy?: PublicCatalogTaxonomy | null;
  catalogSearchResult?: CatalogSearchResult | null;
}

/**
 * Produce the agent's response for a user turn.
 * Pure & synchronous for the rule-based MVP. Returns a Zod-validated action
 * when present so the boundary is enforced even before the LLM era.
 */
export function respond(input: RespondInput): OfistantResponse {
  // Keep cart summary fresh in the context before deciding.
  const ctx = withCartSummary(input.ctx, input.cart);
  const raw = runRules({
    text: input.text,
    ctx,
    cart: input.cart,
    taxonomy: input.taxonomy ?? DEFAULT_PUBLIC_TAXONOMY,
    catalogSearchResult: input.catalogSearchResult ?? null,
  });

  // Validate the action shape at the boundary.
  if (raw.action) {
    const parsed = ofistantActionSchema.safeParse(raw.action);
    if (!parsed.success) {
      return {
        message:
          raw.message +
          " (Catatan: ada action yang belum valid; abaikan jika perlu.)",
        quickReplies: raw.quickReplies,
      };
    }
    raw.action = parsed.data as OfistantAction;
  }

  // Merge context patches deterministically.
  if (raw.contextPatch) {
    raw.contextPatch = mergePatch(ctx, raw.contextPatch);
  }
  return raw;
}

/**
 * Helper for the UI to merge the agent's contextPatch into the live context.
 */
export function applyResponse(
  ctx: OfistantContext,
  res: OfistantResponse,
): OfistantContext {
  if (!res.contextPatch) return ctx;
  return mergePatch(ctx, res.contextPatch);
}

const FALLBACK_MESSAGE_PREFIXES = [
  "Maaf, saya belum yakin maksud Anda",
  "Maaf saya belum menangkap maksudnya",
];

/**
 * True when the rule engine fell through to its generic "I don't understand"
 * fallback. The API route uses this to decide whether to escalate the turn to
 * the LLM (which handles natural conversation the rules can't parse).
 */
export function isFallbackOfistantResponse(res: OfistantResponse): boolean {
  return FALLBACK_MESSAGE_PREFIXES.some((prefix) =>
    res.message.startsWith(prefix),
  );
}
