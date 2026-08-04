import { NextResponse } from "next/server";

import { processBiteshipWebhook } from "@/features/carrier-shipping/carrier-shipping.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "shipping.biteship.webhook"), limit: 120, windowMs: 60_000 });
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const result = await processBiteshipWebhook({ headers: request.headers, rawBody, payload, request });
    return NextResponse.json({
      ok: true,
      idempotent: result.idempotent,
      shipmentId: result.shipment.id,
      status: result.shipment.shipmentStatus,
    });
  } catch (error) {
    return safeErrorResponse(error, "Webhook pengiriman tidak valid.", 401);
  }
}

