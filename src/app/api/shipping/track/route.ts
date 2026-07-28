import { NextResponse } from "next/server";

import { shippingService } from "@/features/shipping/shipping.service";
import { trackingQuerySchema } from "@/features/shipping/shipping.validation";
import { requireAuth } from "@/lib/security/auth-guard";
import { requireCompanyAccess } from "@/lib/security/company-access";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { requireRole } from "@/lib/security/role-guard";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { parseQueryParams } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "shipping.track"),
      limit: 60,
      windowMs: 60_000,
    });
    const parsed = parseQueryParams(trackingQuerySchema, request);
    const session = requireAuth(request, {
      companyId: parsed.companyId,
      userId: parsed.userId,
    });
    requireRole(session, "order:view");
    const shipment = shippingService.trackShipment(parsed.shipmentId);
    if (!shipment) {
      throw createApiError("NOT_FOUND", "Data pengiriman belum tersedia.", 404);
    }
    requireCompanyAccess(session, shipment.companyId, request, "shipment", shipment.id);
    return NextResponse.json({ ok: true, shipment });
  } catch (error) {
    return safeErrorResponse(error, "Data pengiriman belum tersedia.", 404);
  }
}
