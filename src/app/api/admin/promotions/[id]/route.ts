import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { stopPromotion, updatePromotion } from "@/features/promotions/promotion.service";
import { promotionPayloadSchema } from "@/features/promotions/promotion.validation";
import { logAuditEvent } from "@/lib/security/audit-log";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = requireInternalAdmin(request, "admin:catalog:update");
    const { id } = await context.params;
    const payload = validateInput(promotionPayloadSchema, await request.json());
    const promotion = await updatePromotion(id, payload);
    logAuditEvent({ request, actorId: actor.id, actorType: "internal", action: "woocommerce_coupon_updated", entityType: "woocommerce_coupon", entityId: String(promotion.id), metadata: { code: promotion.code } });
    return NextResponse.json({ ok: true, promotion });
  } catch (error) {
    return safeErrorResponse(error, "Promo belum dapat diperbarui.", 400);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = requireInternalAdmin(request, "admin:catalog:update");
    const { id } = await context.params;
    const promotion = await stopPromotion(id);
    logAuditEvent({ request, actorId: actor.id, actorType: "internal", action: "woocommerce_coupon_stopped", entityType: "woocommerce_coupon", entityId: String(promotion.id), metadata: { code: promotion.code } });
    return NextResponse.json({ ok: true, promotion });
  } catch (error) {
    return safeErrorResponse(error, "Promo belum dapat dihentikan.", 400);
  }
}
