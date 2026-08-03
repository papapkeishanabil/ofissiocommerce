import { NextResponse } from "next/server";

import { listQuotationRequests } from "@/features/quotation/quotation.service";
import { quotationListQuerySchema } from "@/features/quotation/quotation.validation";
import { sanitizeQuotationForCustomer } from "@/features/quotation/quotation.utils";
import { requireAuth } from "@/lib/security/auth-guard";
import { requireCompanyAccess } from "@/lib/security/company-access";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { requireRole } from "@/lib/security/role-guard";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { parseQueryParams } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "quotation.list"),
      limit: 80,
      windowMs: 60_000,
    });
    const query = parseQueryParams(quotationListQuerySchema, request);
    const session = requireAuth(request, {
      companyId: query.companyId,
      userId: query.userId,
    });
    requireRole(session, "order:view");
    requireCompanyAccess(session, session.companyId, request, "quotation", "list");
    const quotations = (await listQuotationRequests(session.companyId)).map(
      sanitizeQuotationForCustomer,
    );
    return NextResponse.json({ ok: true, quotations });
  } catch (error) {
    return safeErrorResponse(error, "Quotation belum dapat dimuat.", 400);
  }
}
