import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { adminWooProductIdParamSchema } from "@/features/admin/admin.validation";
import { getAdminWooCommerceProduct } from "@/features/products/woocommerce/woocommerce-product-admin.service";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.products.woocommerce.readiness"),
      limit: 90,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:catalog:view");
    const { id } = validateInput(
      adminWooProductIdParamSchema,
      await context.params,
    );
    const product = await getAdminWooCommerceProduct(id);
    logAuditEvent({
      request,
      actorId: actor.id,
      actorType: "internal",
      action: "admin_product_readiness_viewed",
      entityType: "product",
      entityId: String(id),
      metadata: { readinessStatus: product.readiness.status },
    });
    return NextResponse.json(
      { ok: true, productId: product.id, readiness: product.readiness },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return safeErrorResponse(error, "Status kesiapan produk belum dapat dimuat.", 403);
  }
}
