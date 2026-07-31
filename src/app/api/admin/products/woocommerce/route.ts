import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { listAdminWooCommerceProducts } from "@/features/products/woocommerce/woocommerce-product-admin.service";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

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
