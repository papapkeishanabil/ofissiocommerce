import { NextResponse } from "next/server";

import {
  getAdminQuotationDetail,
  requireInternalAdmin,
} from "@/features/admin/admin.service";
import { adminIdParamSchema } from "@/features/admin/admin.validation";
import {
  buildPaymentSnapshotForWooRetry,
  createWooCommerceOrderFromQuotation,
} from "@/features/orders/woocommerce-order-sync.service";
import { repositoryRegistry } from "@/features/repositories/repository.factory";
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
      key: createRateLimitKey(request, "admin.quotations.sync_woocommerce"),
      limit: 20,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:quotation:update");
    const { id } = validateInput(adminIdParamSchema, await context.params);
    const detail = await getAdminQuotationDetail(id);
    if (!detail) {
      throw createApiError("NOT_FOUND", "Quotation tidak ditemukan.", 404);
    }
    if (!detail.quotation.convertedOrderId) {
      throw createApiError(
        "BAD_REQUEST",
        "Quotation harus dikonversi ke order Ofissio sebelum sync WooCommerce.",
        400,
      );
    }

    const order = await repositoryRegistry.orders.getOrderById({
      companyId: detail.quotation.companyId,
      orderId: detail.quotation.convertedOrderId,
    });
    if (!order) {
      throw createApiError("NOT_FOUND", "Order hasil convert tidak ditemukan.", 404);
    }

    const result = await createWooCommerceOrderFromQuotation({
      quotation: detail.quotation,
      order,
      payment: buildPaymentSnapshotForWooRetry(order),
      request,
      actorId: actor.id,
      actorType: "internal",
    });

    return NextResponse.json({ ok: true, sync: result });
  } catch (error) {
    return safeErrorResponse(error, "Quotation belum dapat disinkronkan ke WooCommerce.", 403);
  }
}
