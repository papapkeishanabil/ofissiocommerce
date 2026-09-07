import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { adminIdParamSchema } from "@/features/admin/admin.validation";
import { addInternalBriefSignature } from "@/features/quotation/quotation.service";
import { adminBriefSignatureBodySchema } from "@/features/quotation/quotation.validation";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.quotation.brief-signature"), limit: 30, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:quotation:update");
    const { id } = validateInput(adminIdParamSchema, await context.params);
    const payload = validateInput(adminBriefSignatureBodySchema, await request.json());
    const quotation = await addInternalBriefSignature({
      id,
      actorId: actor.id,
      party: payload.party,
      signerName: payload.signerName,
      signerTitle: payload.signerTitle,
      request,
    });
    return NextResponse.json({ ok: true, quotation });
  } catch (error) {
    return safeErrorResponse(error, "Tanda tangan internal belum dapat diproses.", 400);
  }
}
