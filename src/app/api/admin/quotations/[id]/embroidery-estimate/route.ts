import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { adminIdParamSchema } from "@/features/admin/admin.validation";
import { embroideryEstimatePayloadSchema } from "@/features/quotation/embroidery-estimate.validation";
import { updateEmbroideryConsultationEstimate } from "@/features/quotation/quotation.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.quotation.embroidery-estimate"), limit: 30, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:quotation:update");
    const { id } = validateInput(adminIdParamSchema, await context.params);
    const payload = validateInput(embroideryEstimatePayloadSchema, await request.json());
    const quotation = await updateEmbroideryConsultationEstimate({ id, payload, actorId: actor.id, request });
    return NextResponse.json({ ok: true, quotation });
  } catch (error) {
    return safeErrorResponse(error, "Estimasi bordir belum dapat disimpan.", 400);
  }
}
