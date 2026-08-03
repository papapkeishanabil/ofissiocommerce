import { NextResponse } from "next/server";

import { createQuotationRequest } from "@/features/quotation/quotation.service";
import { quotationRequestBodySchema } from "@/features/quotation/quotation.validation";
import { sanitizeQuotationForCustomer } from "@/features/quotation/quotation.utils";
import { logAuditEvent } from "@/lib/security/audit-log";
import { requireAuth } from "@/lib/security/auth-guard";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { requireRole } from "@/lib/security/role-guard";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "quotation.request"),
      limit: 20,
      windowMs: 60_000,
    });
    const payload = validateInput(
      quotationRequestBodySchema,
      await request.json(),
    );
    const session = requireAuth(request, {
      companyId: request.headers.get("x-ofissio-company-id"),
      companyName: request.headers.get("x-ofissio-company-name"),
      userId: request.headers.get("x-ofissio-user-id"),
      email: request.headers.get("x-ofissio-user-email"),
      name: request.headers.get("x-ofissio-user-name"),
      role: request.headers.get("x-ofissio-role"),
    });
    requireRole(session, "quotation:create");

    const result = await createQuotationRequest(
      {
        companyId: session.companyId,
        companyName:
          session.companyName ??
          request.headers.get("x-ofissio-company-name") ??
          session.companyId,
        userId: session.userId,
        userEmail: session.email,
        userName: session.name,
        picName:
          payload.picName ??
          request.headers.get("x-ofissio-user-name") ??
          session.name,
        picEmail:
          payload.picEmail ??
          request.headers.get("x-ofissio-user-email") ??
          session.email,
        picWhatsapp: payload.picWhatsapp ?? null,
        customerNotes: payload.customerNotes ?? null,
        shippingDestination: payload.shippingDestination ?? null,
        items: payload.items,
      },
      request,
    );

    logAuditEvent({
      request,
      actorId: session.userId,
      actorType: "customer",
      companyId: session.companyId,
      action: "quotation_request_api_created",
      entityType: "quotation",
      entityId: result.quotation.id,
      metadata: {
        quotationNumber: result.quotation.quotationNumber,
        emailStatus: result.quotation.emailStatus,
      },
    });
    return NextResponse.json(
      {
        ok: true,
        quotation: sanitizeQuotationForCustomer(result.quotation),
        emails: result.emails,
      },
      { status: 201 },
    );
  } catch (error) {
    return safeErrorResponse(
      error,
      "Request quotation belum dapat diproses.",
      400,
    );
  }
}
