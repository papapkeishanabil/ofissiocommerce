import { NextResponse } from "next/server";

import { quotationEmailRequestSchema } from "@/features/quotation/quotation-email.validation";
import { sendQuotationEmail } from "@/features/quotation/quotation-email.service";
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
      key: createRateLimitKey(request, "quotation.email"),
      limit: 20,
      windowMs: 60_000,
    });
    const payload = validateInput(
      quotationEmailRequestSchema,
      await request.json(),
    );
    const session = requireAuth(request, {
      companyId: payload.companyId,
      userId: payload.userId,
    });
    requireRole(session, "quotation:create");
    requireCompanyAccess(
      session,
      payload.companyId,
      request,
      "quotation",
      payload.quotation.id,
    );

    const notification = await sendQuotationEmail(payload, request);
    return NextResponse.json({ ok: true, notification });
  } catch (error) {
    return safeErrorResponse(
      error,
      "Request quotation tercatat, tetapi notifikasi email belum dapat diproses.",
      400,
    );
  }
}
