// src/app/api/ofistant/chat/route.ts
// Ofistant chat endpoint (HYBRID). Runs the Gemini LLM brain when configured;
// otherwise (or on LLM failure) it transparently falls back to the existing
// rule engine server-side, fed with real catalog data.
//
// The route is ANONYMOUS-ACCESSIBLE: Ofistant's first message is pre-login, so
// we intentionally do NOT require auth. A session, if present, only enriches
// the context (e.g. companyId for order-status lookups).
//
// Response contract is always { ok: true, result: OfistantResponse, source }.

import { NextResponse } from "next/server";
import { z } from "zod";

import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { validateInput } from "@/lib/security/validate-input";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { getCurrentSession } from "@/features/auth/auth.service";
import { getPublicCatalogTaxonomy } from "@/features/catalog-taxonomy/catalog-taxonomy.service";
import { withCatalogSearchVocabulary } from "@/features/catalog-taxonomy/catalog-taxonomy.defaults";
import { searchCatalogProducts } from "@/features/catalog-taxonomy/catalog-product-search.service";
import {
  isFallbackOfistantResponse,
  respond,
} from "@/lib/ofistant/ofistant.service";
import { emptyContext, type OfistantContext } from "@/lib/ofistant/ofistant.types";
import {
  chatMessagePayloadSchema,
  generateOfistantReply,
  isOfistantLlmConfigured,
  ofistantContextPayloadSchema,
} from "@/lib/ofistant/ofistant-llm.service";

export const runtime = "nodejs";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(800),
  context: ofistantContextPayloadSchema.default({}),
  cart: z.object({
    itemCount: z.number(),
    totalQty: z.number(),
    totalEstimatedPrice: z.number(),
  }),
  history: z.array(chatMessagePayloadSchema).max(20).optional(),
});

export async function POST(req: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(req, "ofistant.chat"),
      limit: 20,
      windowMs: 60_000,
    });

    const body = validateInput(bodySchema, await req.json());

    // Session is OPTIONAL (anonymous OK). The sync guard can throw when the
    // configured auth provider is async — treat that as anonymous rather than
    // failing the whole request.
    let sessionCompanyId: string | null = null;
    try {
      const session = getCurrentSession(req);
      sessionCompanyId = session?.companyId ?? null;
    } catch {
      sessionCompanyId = null;
    }
    const companyId = sessionCompanyId ?? body.context.companyId ?? null;

    const ctx: OfistantContext = {
      ...emptyContext(),
      ...body.context,
      companyId,
    } as OfistantContext;

    // ---- Rule engine first (source of truth for factual answers) -------
    const taxonomy = withCatalogSearchVocabulary(
      await getPublicCatalogTaxonomy(),
    );
    const catalogSearchResult = await searchCatalogProducts(body.message);
    const ruleResult = respond({
      text: body.message,
      ctx,
      cart: body.cart,
      taxonomy,
      catalogSearchResult,
    });

    // ---- LLM only when rules fell through to the generic fallback -----
    // (the natural-conversation turns the rules can't parse) and the LLM
    // is configured. Factual queries keep the accurate rule result.
    if (isFallbackOfistantResponse(ruleResult) && isOfistantLlmConfigured()) {
      const llm = await generateOfistantReply({
        message: body.message,
        context: ctx,
        cart: body.cart,
        history: body.history ?? [],
        companyId,
      });
      if (llm.ok) {
        return NextResponse.json({
          ok: true,
          result: llm.response,
          source: llm.source,
        });
      }
      // LLM failed: return the rule fallback (still a valid answer).
    }

    return NextResponse.json({ ok: true, result: ruleResult, source: "rules" });
  } catch (error) {
    return safeErrorResponse(
      error,
      "Maaf, Ofistant sedang sibuk. Coba lagi sebentar.",
      500,
    );
  }
}
