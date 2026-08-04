import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { createCarrierShipment } from "@/features/carrier-shipping/carrier-shipping.service";
import { carrierCreateRequestSchema, carrierOrderIdSchema } from "@/features/carrier-shipping/carrier-shipping.validation";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.shipping.create"), limit: 12, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:shipment:update");
    const { id } = validateInput(carrierOrderIdSchema, await context.params);
    const payload = validateInput(carrierCreateRequestSchema, await request.json().catch(() => ({})));
    const result = await createCarrierShipment({ orderId: id, quoteId: payload.quoteId, actorId: actor.id, request });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return safeErrorResponse(error, "Shipment belum dapat dibuat.", 400);
  }
}

