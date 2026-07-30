import { NextResponse } from "next/server";

import {
  getAdminShipmentDetail,
  patchAdminShipment,
  requireInternalAdmin,
} from "@/features/admin/admin.service";
import {
  shipmentIdParamSchema,
  updateShipmentSchema,
} from "@/features/shipments/shipment.validation";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.shipments.detail"),
      limit: 80,
      windowMs: 60_000,
    });
    requireInternalAdmin(request, "admin:shipment:view");
    const { id } = validateInput(shipmentIdParamSchema, await context.params);
    const detail = await getAdminShipmentDetail(id);
    if (!detail) throw createApiError("NOT_FOUND", "Shipment tidak ditemukan.", 404);
    return NextResponse.json({ ok: true, ...detail });
  } catch (error) {
    return safeErrorResponse(error, "Shipment tidak ditemukan.", 404);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.shipments.patch"),
      limit: 40,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:shipment:update");
    const { id } = validateInput(shipmentIdParamSchema, await context.params);
    const payload = validateInput(
      updateShipmentSchema,
      await request.json().catch(() => ({})),
    );
    const detail = await patchAdminShipment({
      shipmentId: id,
      payload,
      actor,
      request,
    });
    return NextResponse.json({ ok: true, ...detail });
  } catch (error) {
    return safeErrorResponse(error, "Shipment belum dapat diupdate.", 403);
  }
}
