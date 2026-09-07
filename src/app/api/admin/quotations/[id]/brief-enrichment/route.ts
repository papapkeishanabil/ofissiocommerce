import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { adminIdParamSchema } from "@/features/admin/admin.validation";
import { startBriefEnrichment } from "@/features/quotation/quotation.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.quotation.brief_enrichment"), limit: 20, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:quotation:update");
    const { id } = validateInput(adminIdParamSchema, await context.params);
    const quotation = await startBriefEnrichment({
      id,
      actorId: actor.id,
      request,
    });
    return NextResponse.json({ ok: true, quotation });
  } catch (error) {
    return safeErrorResponse(error, "Pengayaan brief belum dapat dimulai.", 400);
  }
}
