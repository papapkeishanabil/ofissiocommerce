import { NextResponse } from "next/server";

import { checkCarrierShippingRates } from "@/features/carrier-shipping/carrier-shipping.service";
import { carrierOrderIdSchema, carrierRateRequestSchema } from "@/features/carrier-shipping/carrier-shipping.validation";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.shipping.rates"), limit: 20, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:shipment:update");
    const { id } = validateInput(carrierOrderIdSchema, await context.params);
    const payload = validateInput(carrierRateRequestSchema, await request.json().catch(() => ({})));
    const quotes = await checkCarrierShippingRates({
      orderId: id,
      actorId: actor.id,
      courierFilter: payload.couriers,
      request,
    });
    return NextResponse.json({ ok: true, quotes });
  } catch (error) {
    return safeErrorResponse(error, "Ongkir belum dapat diperiksa.", 400);
  }
}

