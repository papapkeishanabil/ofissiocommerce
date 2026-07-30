import { NextResponse } from "next/server";
import { z } from "zod";

import { getShipmentDetail } from "@/features/shipments/shipment.service";
import { mapShipmentToPublic } from "@/features/shipments/shipment.utils";
import { requireAuth } from "@/lib/security/auth-guard";
import { requireCompanyAccess } from "@/lib/security/company-access";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { requireRole } from "@/lib/security/role-guard";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { parseQueryParams } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const shipmentDetailQuerySchema = z.object({
  companyId: z.string().trim().min(1).max(100).optional(),
  userId: z.string().trim().min(1).max(100).optional(),
});

export async function GET(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "customer.shipment.detail"),
      limit: 80,
      windowMs: 60_000,
    });
    const { id } = await context.params;
    const query = parseQueryParams(shipmentDetailQuerySchema, request);
    const session = requireAuth(request, {
      companyId: query.companyId,
      userId: query.userId,
    });
    requireRole(session, "order:view");
    const detail = await getShipmentDetail({
      shipmentId: id,
      companyId: session.companyId,
    });
    if (!detail) throw createApiError("NOT_FOUND", "Shipment tidak ditemukan.", 404);
    requireCompanyAccess(session, detail.shipment.companyId, request, "shipment", id);
    return NextResponse.json({
      ok: true,
      shipment: mapShipmentToPublic(detail.shipment, detail.events),
    });
  } catch (error) {
    return safeErrorResponse(error, "Shipment tidak ditemukan.", 404);
  }
}
