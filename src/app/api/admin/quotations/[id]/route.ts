import { NextResponse } from "next/server";

import {
  getAdminQuotationDetail,
  requireInternalAdmin,
  updateAdminQuotationStatus,
} from "@/features/admin/admin.service";
import {
  adminIdParamSchema,
  adminQuotationStatusPatchSchema,
} from "@/features/admin/admin.validation";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.quotations.detail"),
      limit: 80,
      windowMs: 60_000,
    });
    requireInternalAdmin(request, "admin:quotation:view");
    const { id } = validateInput(adminIdParamSchema, await context.params);
    const detail = await getAdminQuotationDetail(id);
    if (!detail) throw createApiError("NOT_FOUND", "Quotation tidak ditemukan.", 404);
    return NextResponse.json({ ok: true, ...detail });
  } catch (error) {
    return safeErrorResponse(error, "Admin quotation tidak ditemukan.", 404);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.quotations.patch"),
      limit: 40,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:quotation:update");
    const { id } = validateInput(adminIdParamSchema, await context.params);
    const payload = validateInput(
      adminQuotationStatusPatchSchema,
      await request.json(),
    );
    const quotation = await updateAdminQuotationStatus({
      id,
      status: payload.status,
      internalNote: payload.internalNote,
      actor,
      request,
    });
    return NextResponse.json({ ok: true, quotation });
  } catch (error) {
    return safeErrorResponse(error, "Status quotation belum dapat diperbarui.", 403);
  }
}
