import { NextResponse } from "next/server";

import { getPublicGlobalEmbroideryPricing } from "@/features/embroidery-pricing/global-embroidery-pricing.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "customization.embroidery_pricing"), limit: 120, windowMs: 60_000 });
    const result = await getPublicGlobalEmbroideryPricing();
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (error) {
    return safeErrorResponse(error, "Harga bordir belum dapat dimuat.", 503);
  }
}
