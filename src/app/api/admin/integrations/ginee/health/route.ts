import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { getGineeHealth } from "@/features/integrations/ginee/ginee.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.ginee.health"), limit: 30, windowMs: 60_000 });
    requireInternalAdmin(request, "admin:integration:ginee:view");
    const health = await getGineeHealth();
    return NextResponse.json({ ok: true, health }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return safeErrorResponse(error, "Status koneksi Ginee belum dapat dimuat.", 403);
  }
}
