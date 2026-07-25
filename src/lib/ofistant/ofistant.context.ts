// src/lib/ofistant/ofistant.context.ts
// Pure helpers for evolving the session context. Kept side-effect free so
// they can be unit-tested and reused by the future LLM layer.

import type { JourneyStage, OfistantContext } from "./ofistant.types";
import type { SizeMatrixSnapshot } from "./ofistant.types";

export function withJourney(
  ctx: OfistantContext,
  next: JourneyStage,
): OfistantContext {
  if (ctx.journeyStage === next) return ctx;
  return { ...ctx, journeyStage: next };
}

export function withSelectedIndustry(
  ctx: OfistantContext,
  industry: string | null,
): OfistantContext {
  return withJourney(
    { ...ctx, selectedIndustry: industry, turnsTaken: ctx.turnsTaken + 1 },
    industry ? "INDUSTRY_SELECTED" : ctx.journeyStage,
  );
}

export function withProductViewed(
  ctx: OfistantContext,
  productId: string,
  slug?: string,
): OfistantContext {
  const viewed = ctx.viewedProductIds.includes(productId)
    ? ctx.viewedProductIds
    : [productId, ...ctx.viewedProductIds].slice(0, 12);
  return withJourney(
    {
      ...ctx,
      selectedProductId: productId,
      selectedProductSlug: slug ?? ctx.selectedProductSlug,
      viewedProductIds: viewed,
      turnsTaken: ctx.turnsTaken + 1,
    },
    "PRODUCT_VIEWED",
  );
}

export function withConfiguringProduct(
  ctx: OfistantContext,
  patch: Partial<OfistantContext>,
): OfistantContext {
  return withJourney(
    { ...ctx, ...patch, turnsTaken: ctx.turnsTaken + 1 },
    "CONFIGURING_PRODUCT",
  );
}

export function withItemAdded(ctx: OfistantContext): OfistantContext {
  return withJourney(
    { ...ctx, turnsTaken: ctx.turnsTaken + 1 },
    "ITEM_ADDED_TO_CART",
  );
}

export function withCartSummary(
  ctx: OfistantContext,
  summary: OfistantContext["cartSummary"],
): OfistantContext {
  return { ...ctx, cartSummary: summary };
}

export function mergePatch(
  ctx: OfistantContext,
  patch: Partial<OfistantContext>,
): OfistantContext {
  let next: OfistantContext = { ...ctx, ...patch, turnsTaken: ctx.turnsTaken + 1 };
  // Coerce journey stage if explicitly provided.
  if (patch.journeyStage) {
    next = withJourney(next, patch.journeyStage);
  }
  return next;
}

export function summarizeSizeMatrix(
  m: SizeMatrixSnapshot | null,
): number {
  if (!m) return 0;
  return m.S + m.M + m.L + m.XL + m["2XL"] + m["3XL"];
}
