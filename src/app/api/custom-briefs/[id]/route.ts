import { NextResponse } from "next/server";

import {
  getQuotationRequestById,
  updateSalesAssistedBriefApproval,
} from "@/features/quotation/quotation.service";
import { customBriefApprovalBodySchema } from "@/features/quotation/quotation.validation";
import { getBriefApprovalStatus } from "@/features/quotation/quotation-requirement";
import { sanitizeQuotationForCustomer } from "@/features/quotation/quotation.utils";
import { requireAuth } from "@/lib/security/auth-guard";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { requireRole } from "@/lib/security/role-guard";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function customerSession(request: Request) {
  const session = requireAuth(request, {
    companyId: request.headers.get("x-ofissio-company-id"),
    companyName: request.headers.get("x-ofissio-company-name"),
    userId: request.headers.get("x-ofissio-user-id"),
    email: request.headers.get("x-ofissio-user-email"),
    name: request.headers.get("x-ofissio-user-name"),
    role: request.headers.get("x-ofissio-role"),
  });
  requireRole(session, "quotation:create");
  return session;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "custom_brief.detail"),
      limit: 80,
      windowMs: 60_000,
    });
    const session = customerSession(request);
    const { id } = await context.params;
    const quotation = await getQuotationRequestById(id, session.companyId);
    if (
      !quotation ||
      quotation.source !== "custom_request" ||
      quotation.productionBrief?.intakeChannel === "customer_portal"
    ) {
      throw createApiError("NOT_FOUND", "Brief Full Custom tidak ditemukan.", 404);
    }
    return NextResponse.json({
      ok: true,
      brief: sanitizeQuotationForCustomer(quotation),
      approvalStatus: getBriefApprovalStatus(quotation.productionBrief),
    });
  } catch (error) {
    return safeErrorResponse(error, "Brief Full Custom tidak ditemukan.", 404);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "custom_brief.approval"),
      limit: 12,
      windowMs: 60_000,
    });
    const session = customerSession(request);
    const { id } = await context.params;
    const payload = validateInput(customBriefApprovalBodySchema, await request.json());
    const brief = await updateSalesAssistedBriefApproval({
      id,
      companyId: session.companyId,
      userId: session.userId,
      action: payload.action,
      note: payload.note ?? null,
      request,
    });
    return NextResponse.json({
      ok: true,
      brief: sanitizeQuotationForCustomer(brief),
      approvalStatus: getBriefApprovalStatus(brief.productionBrief),
    });
  } catch (error) {
    return safeErrorResponse(
      error,
      "Persetujuan brief Full Custom belum dapat diproses.",
      400,
    );
  }
}
