import { NextResponse } from "next/server";

import { shippingService } from "@/features/shipping/shipping.service";
import { shippingRateRequestSchema } from "@/features/shipping/shipping.validation";
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
      key: createRateLimitKey(request, "shipping.rates"),
      limit: 30,
      windowMs: 60_000,
    });
    const payload: unknown = await request.json();
    const parsed = validateInput(shippingRateRequestSchema, payload);
    const session = requireAuth(request, {
      companyId: parsed.companyId,
      userId: parsed.userId,
    });
    requireRole(session, "checkout:create");
    requireCompanyAccess(session, parsed.companyId, request, "shipping_rate");

    const clientKey =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "local";
    const rates = await shippingService.getRates(parsed, clientKey);
    logAuditEvent({
      request,
      actorId: session.userId,
      actorType: "customer",
      companyId: session.companyId,
      action: "shipping_rates_requested",
      entityType: "shipping_rate",
      metadata: {
        destinationCity: parsed.destination.city,
        itemCount: parsed.items.length,
      },
    });
    return NextResponse.json({ ok: true, rates });
  } catch (error) {
    return safeErrorResponse(
      error,
      "Ongkir belum bisa dihitung otomatis. Tim Ofissio akan mengonfirmasi ongkir melalui quotation.",
      503,
    );
  }
}
