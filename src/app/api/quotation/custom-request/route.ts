import { NextResponse } from "next/server";

import { createCustomQuotationRequest } from "@/features/quotation/quotation.service";
import { customQuotationRequestBodySchema } from "@/features/quotation/quotation.validation";
import { sanitizeQuotationForCustomer } from "@/features/quotation/quotation.utils";
import { requireAuth } from "@/lib/security/auth-guard";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { requireRole } from "@/lib/security/role-guard";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "quotation.custom_request"),
      limit: 10,
      windowMs: 60_000,
    });
    const session = requireAuth(request, {
      companyId: request.headers.get("x-ofissio-company-id"),
      companyName: request.headers.get("x-ofissio-company-name"),
      userId: request.headers.get("x-ofissio-user-id"),
      email: request.headers.get("x-ofissio-user-email"),
      name: request.headers.get("x-ofissio-user-name"),
      role: request.headers.get("x-ofissio-role"),
    });
    requireRole(session, "quotation:create");
    const payload = validateInput(
      customQuotationRequestBodySchema,
      await request.json(),
    );
    const result = await createCustomQuotationRequest(
      {
        companyId: session.companyId,
        companyName: session.companyName ?? session.companyId,
        userId: session.userId,
        userEmail: session.email,
        userName: session.name,
        picName: payload.picName ?? session.name,
        picEmail: payload.picEmail ?? session.email,
        picWhatsapp: payload.picWhatsapp ?? null,
        productionBrief: payload.productionBrief,
        referenceFileIds: payload.referenceFileIds,
        customerNotes: payload.customerNotes ?? null,
      },
      request,
    );

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
      "Permintaan full custom belum dapat diproses.",
      400,
    );
  }
}
