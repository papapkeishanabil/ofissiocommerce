import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { getWooOrderSyncStatus } from "@/features/orders/woocommerce-order-sync.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.woocommerce.status"),
      limit: 60,
      windowMs: 60_000,
    });
    requireInternalAdmin(request, "admin:order:view");
    return NextResponse.json({ ok: true, status: getWooOrderSyncStatus() });
  } catch (error) {
    return safeErrorResponse(error, "Status WooCommerce belum dapat dibaca.", 403);
  }
}
