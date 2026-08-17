import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { adminIdParamSchema } from "@/features/admin/admin.validation";
import { productionPlanPayloadSchema } from "@/features/quotation/production-plan.validation";
import { updateProductionPlan } from "@/features/quotation/quotation.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.quotation.production-plan"), limit: 30, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:quotation:update");
    const { id } = validateInput(adminIdParamSchema, await context.params);
    const payload = validateInput(productionPlanPayloadSchema, await request.json());
    const quotation = await updateProductionPlan({ id, payload, actorId: actor.id, request });
    return NextResponse.json({ ok: true, quotation });
  } catch (error) {
    return safeErrorResponse(error, "Rencana produksi belum dapat disimpan.", 400);
  }
}
