import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { getGineeHealth, getGineeProvider, listGineeShops } from "@/features/integrations/ginee/ginee.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.ginee.health"), limit: 30, windowMs: 60_000 });
    requireInternalAdmin(request, "admin:integration:ginee:view");
    const provider = getGineeProvider();
    const shops = await listGineeShops(provider);
    const health = await getGineeHealth(provider, shops);
    return NextResponse.json({ ok: true, health, shops }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return safeErrorResponse(error, "Status koneksi Ginee belum dapat dimuat.", 403);
  }
}
