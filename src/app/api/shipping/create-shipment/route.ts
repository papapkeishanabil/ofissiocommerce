import { NextResponse } from "next/server";

import { shippingService } from "@/features/shipping/shipping.service";
import { createShipmentSchema } from "@/features/shipping/shipping.validation";
import { logAuditEvent } from "@/lib/security/audit-log";
import { requireAuth } from "@/lib/security/auth-guard";
import { requireCompanyAccess } from "@/lib/security/company-access";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { requireRole } from "@/lib/security/role-guard";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "shipping.create_shipment"),
      limit: 20,
      windowMs: 60_000,
    });
    const payload: unknown = await request.json();
    const parsed = validateInput(createShipmentSchema, payload);
    const session = requireAuth(request, {
      companyId: parsed.companyId,
      userId: parsed.userId,
    });
    requireRole(session, "order:view");
    requireCompanyAccess(session, parsed.companyId, request, "shipment");

    const shipment = shippingService.createShipment(parsed);
    logAuditEvent({
      request,
      actorId: session.userId,
      actorType: "customer",
      companyId: session.companyId,
      action: "shipment_created",
      entityType: "shipment",
      entityId: shipment.id,
      metadata: { orderId: shipment.orderId, provider: shipment.provider },
    });
    return NextResponse.json({ ok: true, shipment }, { status: 201 });
  } catch (error) {
    return safeErrorResponse(
      error,
      "Provider pengiriman sedang tidak tersedia.",
      503,
    );
  }
}
