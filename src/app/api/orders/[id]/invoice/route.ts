import { NextResponse } from "next/server";

import { getInvoicePdfSignedUrl } from "@/features/documents/document.service";
import { documentIdParamSchema } from "@/features/documents/document.validation";
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

export async function GET(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "customer.order.invoice"),
      limit: 50,
      windowMs: 60_000,
    });
    const { id } = validateInput(documentIdParamSchema, await context.params);
    const session = requireAuth(request, {
      companyId: request.headers.get("x-ofissio-company-id"),
      userId: request.headers.get("x-ofissio-user-id"),
      role: request.headers.get("x-ofissio-role"),
    });
    requireRole(session, "order:view");
    requireCompanyAccess(session, session.companyId, request, "invoice_pdf", id);
    const result = await getInvoicePdfSignedUrl({
      orderId: id,
      companyId: session.companyId,
      actorId: session.userId,
      request,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return safeErrorResponse(error, "Invoice PDF belum tersedia.", 404);
  }
}
