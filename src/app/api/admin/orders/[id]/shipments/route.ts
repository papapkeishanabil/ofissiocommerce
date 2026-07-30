import { NextResponse } from "next/server";

import {
  createAdminOrderShipment,
  requireInternalAdmin,
} from "@/features/admin/admin.service";
import { adminIdParamSchema } from "@/features/admin/admin.validation";
import { createShipmentSchema } from "@/features/shipments/shipment.validation";
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
      key: createRateLimitKey(request, "admin.orders.shipments.create"),
      limit: 30,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:shipment:update");
    const { id } = validateInput(adminIdParamSchema, await context.params);
    const payload = validateInput(
      createShipmentSchema,
      await request.json().catch(() => ({})),
    );
    const detail = await createAdminOrderShipment({
      orderId: id,
      payload,
      actor,
      request,
    });
    return NextResponse.json({ ok: true, ...detail });
  } catch (error) {
    return safeErrorResponse(error, "Shipment order belum dapat dibuat.", 403);
  }
}
