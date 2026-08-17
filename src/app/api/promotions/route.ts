import { NextResponse } from "next/server";

import { listPublicPromotions } from "@/features/promotions/promotion.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

/** Daftar promo aktif yang aman untuk customer (tanpa mentah WooCommerce). */
export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "promotions.public"),
      limit: 60,
      windowMs: 60_000,
    });
    const promotions = await listPublicPromotions();
    return NextResponse.json(
      { ok: true, promotions },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    return safeErrorResponse(error, "Daftar promo belum dapat dimuat.", 503);
  }
}
