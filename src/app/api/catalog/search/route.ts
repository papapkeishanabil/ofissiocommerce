import { NextResponse } from "next/server";
import { z } from "zod";

import { searchCatalogProducts } from "@/features/catalog-taxonomy/catalog-product-search.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { parseQueryParams } from "@/lib/security/validate-input";

export const runtime = "nodejs";

const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(160),
});

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "catalog.search"),
      limit: 90,
      windowMs: 60_000,
    });
    const { q } = parseQueryParams(searchQuerySchema, request);
    const result = await searchCatalogProducts(q);
    return NextResponse.json(
      { ok: true, result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return safeErrorResponse(error, "Pencarian katalog belum dapat diproses.", 503);
  }
}
