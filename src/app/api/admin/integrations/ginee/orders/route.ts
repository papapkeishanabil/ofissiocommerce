import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { listRecentGineeOrders } from "@/features/integrations/ginee/ginee.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.ginee.orders"), limit: 40, windowMs: 60_000 });
    requireInternalAdmin(request, "admin:integration:ginee:sync_read");
    const orders = await listRecentGineeOrders();
    return NextResponse.json({ ok: true, orders }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return safeErrorResponse(error, "Order Ginee belum dapat dimuat.", 403);
  }
}
