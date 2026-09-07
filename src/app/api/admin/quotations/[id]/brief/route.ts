import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { adminIdParamSchema } from "@/features/admin/admin.validation";
import { updateSalesAssistedBrief } from "@/features/quotation/quotation.service";
import { adminBriefUpdateSchema } from "@/features/quotation/quotation.validation";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.quotation.brief"), limit: 30, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:quotation:update");
    const { id } = validateInput(adminIdParamSchema, await context.params);
    const payload = validateInput(adminBriefUpdateSchema, await request.json());
    const quotation = await updateSalesAssistedBrief({
      id,
      actorId: actor.id,
      brief: payload.productionBrief,
      note: payload.note ?? null,
      requireCustomerApproval: payload.requireCustomerApproval ?? true,
      request,
    });
    return NextResponse.json({ ok: true, quotation });
  } catch (error) {
    return safeErrorResponse(error, "Brief Full Custom belum dapat disimpan.", 400);
  }
}
