import { NextResponse } from "next/server";

import {
  addAdminShipmentEvent,
  requireInternalAdmin,
} from "@/features/admin/admin.service";
import {
  shipmentEventSchema,
  shipmentIdParamSchema,
} from "@/features/shipments/shipment.validation";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.shipments.event"),
      limit: 60,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:shipment:update");
    const { id } = validateInput(shipmentIdParamSchema, await context.params);
    const payload = validateInput(
      shipmentEventSchema,
      await request.json().catch(() => ({})),
    );
    const event = await addAdminShipmentEvent({
      shipmentId: id,
      payload,
      actor,
      request,
    });
    return NextResponse.json({ ok: true, event });
  } catch (error) {
    return safeErrorResponse(error, "Event shipment belum dapat ditambahkan.", 403);
  }
}
