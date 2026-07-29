import { NextResponse } from "next/server";

import { listAdminOrders, requireInternalAdmin } from "@/features/admin/admin.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.orders.list"),
      limit: 80,
      windowMs: 60_000,
    });
    requireInternalAdmin(request, "admin:order:view");
    const orders = await listAdminOrders();
    return NextResponse.json({ ok: true, orders });
  } catch (error) {
    return safeErrorResponse(error, "Admin orders belum dapat dimuat.", 403);
  }
}
