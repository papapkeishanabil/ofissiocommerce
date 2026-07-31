import { NextResponse } from "next/server";

import { getPublicCatalogTaxonomy } from "@/features/catalog-taxonomy/catalog-taxonomy.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "catalog.taxonomy.public"),
      limit: 120,
      windowMs: 60_000,
    });
    const taxonomy = await getPublicCatalogTaxonomy();
    return NextResponse.json(
      { ok: true, taxonomy },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    return safeErrorResponse(error, "Taxonomy katalog belum dapat dimuat.", 503);
  }
}
