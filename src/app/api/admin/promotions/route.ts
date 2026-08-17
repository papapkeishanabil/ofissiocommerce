import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { createPromotion, listPromotions } from "@/features/promotions/promotion.service";
import { woocommerceClient } from "@/features/products/woocommerce/woocommerce.client";
import { promotionPayloadSchema } from "@/features/promotions/promotion.validation";
import { logAuditEvent } from "@/lib/security/audit-log";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    requireInternalAdmin(request, "admin:catalog:view");
    const [promotions, products, categories] = await Promise.all([
      listPromotions(),
      woocommerceClient.getProducts({ status: "publish", per_page: 100 }),
      woocommerceClient.getCategories(),
    ]);
    return NextResponse.json({ ok: true, promotions, products, categories }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return safeErrorResponse(error, "Promo WooCommerce belum dapat dimuat.", 403);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireInternalAdmin(request, "admin:catalog:update");
    const payload = validateInput(promotionPayloadSchema, await request.json());
    const promotion = await createPromotion(payload);
    logAuditEvent({ request, actorId: actor.id, actorType: "internal", action: "woocommerce_coupon_created", entityType: "woocommerce_coupon", entityId: String(promotion.id), metadata: { code: promotion.code } });
    return NextResponse.json({ ok: true, promotion }, { status: 201 });
  } catch (error) {
    return safeErrorResponse(error, "Promo belum dapat dibuat.", 400);
  }
}
