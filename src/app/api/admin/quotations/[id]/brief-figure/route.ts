import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { adminIdParamSchema } from "@/features/admin/admin.validation";
import { attachSalesAssistedBriefFigure } from "@/features/quotation/quotation.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";
import { z } from "zod";

export const runtime = "nodejs";

const figureFormSchema = z.object({
  garmentId: z.string().trim().min(1).max(100),
  side: z.enum(["front", "back"]),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.quotation.brief-figure"), limit: 20, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:quotation:update");
    const { id } = validateInput(adminIdParamSchema, await context.params);

    const formData = await request.formData();
    const payload = validateInput(figureFormSchema, {
      garmentId: formData.get("garmentId"),
      side: formData.get("side"),
    });
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw createApiError("VALIDATION_ERROR", "File figur belum valid.", 400);
    }

    const result = await attachSalesAssistedBriefFigure({
      id,
      garmentId: payload.garmentId,
      side: payload.side,
      file,
      actorId: actor.id,
      request,
    });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return safeErrorResponse(error, "Figur lembar approval belum dapat diunggah.", 400);
  }
}
