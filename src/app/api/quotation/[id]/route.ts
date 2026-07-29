import { NextResponse } from "next/server";

import {
  getQuotationEventsById,
  getQuotationRequestById,
} from "@/features/quotation/quotation.service";
import { quotationListQuerySchema } from "@/features/quotation/quotation.validation";
import { requireAuth } from "@/lib/security/auth-guard";
import { requireCompanyAccess } from "@/lib/security/company-access";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { requireRole } from "@/lib/security/role-guard";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { parseQueryParams } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "quotation.detail"),
      limit: 80,
      windowMs: 60_000,
    });
    const { id } = await context.params;
    const query = parseQueryParams(quotationListQuerySchema, request);
    const session = requireAuth(request, {
      companyId: query.companyId,
      userId: query.userId,
    });
    requireRole(session, "order:view");
    const quotation = await getQuotationRequestById(id, session.companyId);
    if (!quotation) {
      throw createApiError("NOT_FOUND", "Quotation tidak ditemukan.", 404);
    }
    requireCompanyAccess(
      session,
      quotation.companyId,
      request,
      "quotation",
      quotation.id,
    );
    const events = (await getQuotationEventsById(id, session.companyId)).map((event) => ({
      id: event.id,
      eventType: event.eventType,
      oldStatus: event.oldStatus,
      newStatus: event.newStatus,
      createdAt: event.createdAt,
      note:
        event.actorType === "customer" ||
        ["customer_accepted", "customer_rejected", "emailed_to_customer", "converted_to_order"].includes(event.eventType)
          ? event.note
          : null,
    }));
    return NextResponse.json({
      ok: true,
      quotation: toCustomerQuotation(quotation),
      events,
    });
  } catch (error) {
    return safeErrorResponse(error, "Quotation tidak ditemukan.", 404);
  }
}

function toCustomerQuotation<T extends { internalNotes?: unknown; salesNotes?: unknown }>(
  quotation: T,
) {
  return {
    ...quotation,
    internalNotes: [],
    salesNotes: null,
  };
}
