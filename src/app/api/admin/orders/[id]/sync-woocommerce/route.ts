import { NextResponse } from "next/server";

import {
  getAdminOrderDetail,
  requireInternalAdmin,
} from "@/features/admin/admin.service";
import { adminIdParamSchema } from "@/features/admin/admin.validation";
import {
  buildPaymentSnapshotForWooRetry,
  createWooCommerceOrderFromOfissioOrder,
} from "@/features/orders/woocommerce-order-sync.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.orders.sync_woocommerce"),
      limit: 20,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:order:update");
    const { id } = validateInput(adminIdParamSchema, await context.params);
    const detail = await getAdminOrderDetail(id);
    if (!detail) throw createApiError("NOT_FOUND", "Order tidak ditemukan.", 404);

    const result = await createWooCommerceOrderFromOfissioOrder({
      order: detail.order,
      payment: buildPaymentSnapshotForWooRetry(detail.order),
      request,
      actorId: actor.id,
      actorType: "internal",
      companyName: detail.tracking?.companyName ?? detail.order.companyId,
      quotationId: detail.order.quotationId ?? null,
    });

    return NextResponse.json({ ok: true, sync: result });
  } catch (error) {
    return safeErrorResponse(error, "Order belum dapat disinkronkan ke WooCommerce.", 403);
  }
}
