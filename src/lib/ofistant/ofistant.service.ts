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

export interface RespondInput {
  text: string;
  ctx: OfistantContext;
  cart: {
    itemCount: number;
    totalQty: number;
    totalEstimatedPrice: number;
  };
}

/**
 * Produce the agent's response for a user turn.
 * Pure & synchronous for the rule-based MVP. Returns a Zod-validated action
 * when present so the boundary is enforced even before the LLM era.
 */
export function respond(input: RespondInput): OfistantResponse {
  // Keep cart summary fresh in the context before deciding.
  const ctx = withCartSummary(input.ctx, input.cart);
  const raw = runRules({ text: input.text, ctx, cart: input.cart });

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
