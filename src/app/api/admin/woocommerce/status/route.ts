import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { getWooOrderSyncStatus } from "@/features/orders/woocommerce-order-sync.service";
import { logAuditEvent } from "@/lib/security/audit-log";
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
    const actor = requireInternalAdmin(request, "admin:order:view");
    const status = getWooOrderSyncStatus();
    logAuditEvent({
      request,
      actorId: actor.id,
      actorType: "internal",
      companyId: null,
      action: "admin_woocommerce_status_checked",
      entityType: "woocommerce",
      entityId: null,
      metadata: {
        enabled: status.enabled,
        configured: status.configured,
        syncOrders: status.syncOrders,
        status: status.status,
        reason: status.reason,
      },
    });
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    return safeErrorResponse(error, "Status WooCommerce belum dapat dibaca.", 403);
  }
}
