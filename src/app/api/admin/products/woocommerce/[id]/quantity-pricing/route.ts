import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { adminWooProductIdParamSchema } from "@/features/admin/admin.validation";
import { updateAdminWooCommerceQuantityPricing } from "@/features/products/woocommerce/woocommerce-product-admin.service";
import { adminWooQuantityPricingPayloadSchema } from "@/features/products/woocommerce/woocommerce-product-management.validation";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  let actorId: string | null = null;
  let productId: number | null = null;
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.products.quantity_pricing.update"),
      limit: 30,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:catalog:update");
    actorId = actor.id;
    const { id } = validateInput(adminWooProductIdParamSchema, await context.params);
    productId = id;
    const payload = validateInput(
      adminWooQuantityPricingPayloadSchema,
      await request.json().catch(() => null),
    );
    const product = await updateAdminWooCommerceQuantityPricing({
      id,
      payload,
      actorId: actor.id,
      request,
    });
    return NextResponse.json({
      ok: true,
      message: "Harga quantity berhasil disimpan.",
      product,
    });
  } catch (error) {
    if (actorId) {
      logAuditEvent({
        request,
        actorId,
        actorType: "internal",
        action: "product_quantity_pricing_update_failed",
        entityType: "product",
        entityId: productId == null ? null : String(productId),
        metadata: { reason: "request_rejected" },
      });
    }
    return safeErrorResponse(error, "Harga quantity belum dapat disimpan.", 400);
  }
}
