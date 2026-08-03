import { NextResponse } from "next/server";

import { requestQuotationRevisionByCustomer } from "@/features/quotation/quotation.service";
import { quotationRevisionBodySchema } from "@/features/quotation/quotation.validation";
import { sanitizeQuotationForCustomer } from "@/features/quotation/quotation.utils";
import { requireAuth } from "@/lib/security/auth-guard";
import { requireCompanyAccess } from "@/lib/security/company-access";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { requireRole } from "@/lib/security/role-guard";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "quotation.request_revision"),
      limit: 20,
      windowMs: 60_000,
    });
    const { id } = await context.params;
    const payload = validateInput(
      quotationRevisionBodySchema,
      await request.json().catch(() => ({})),
    );
    const session = requireAuth(request);
    requireRole(session, "quotation:create");
    requireCompanyAccess(session, session.companyId, request, "quotation", id);
    const quotation = await requestQuotationRevisionByCustomer({
      id,
      companyId: session.companyId,
      userId: session.userId,
      note: payload.note,
      request,
    });
    return NextResponse.json({
      ok: true,
      quotation: sanitizeQuotationForCustomer(quotation),
    });
  } catch (error) {
    return safeErrorResponse(error, "Request revision belum dapat diproses.", 400);
  }
}
