import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import {
  createAdminWooCommerceProduct,
  listAdminWooCommerceProducts,
} from "@/features/products/woocommerce/woocommerce-product-admin.service";
import { adminWooProductPayloadSchema } from "@/features/products/woocommerce/woocommerce-product-management.validation";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.products.woocommerce.list"),
      limit: 60,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:catalog:view");
    const products = await listAdminWooCommerceProducts();
    logAuditEvent({
      request,
      actorId: actor.id,
      actorType: "internal",
      action: "admin_woocommerce_products_viewed",
      entityType: "product",
      metadata: {
        count: products.length,
        incompleteCount: products.filter(
          (product) => !product.readiness.isVisibleInOfissio,
        ).length,
      },
    });
    return NextResponse.json(
      { ok: true, products },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return safeErrorResponse(error, "Produk WooCommerce belum dapat dimuat.", 403);
  }
}

export async function POST(request: Request) {
  let actorId: string | null = null;
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.products.woocommerce.create"),
      limit: 20,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:catalog:update");
    actorId = actor.id;
    const payload = validateInput(
      adminWooProductPayloadSchema,
      await request.json().catch(() => null),
    );
    const product = await createAdminWooCommerceProduct({
      payload,
      actorId: actor.id,
      request,
    });
    return NextResponse.json({ ok: true, product }, { status: 201 });
  } catch (error) {
    if (actorId) {
      logAuditEvent({
        request,
        actorId,
        actorType: "internal",
        action: "product_create_failed",
        entityType: "product",
        metadata: { reason: "request_rejected" },
      });
    }
    return safeErrorResponse(error, "Produk belum dapat dibuat.", 400);
  }
}
