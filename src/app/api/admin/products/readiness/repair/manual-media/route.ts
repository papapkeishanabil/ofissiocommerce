import { NextResponse } from "next/server";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { approveManualMediaEvidence } from "@/features/product-integrity-repair/manual-media-evidence.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.products.integrity-repair.manual-media"), limit: 2, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:catalog:update");
    const body = await request.json() as Record<string, unknown>;
    const result = await approveManualMediaEvidence({
      batchId: String(body.batchId ?? "").trim(),
      productId: Number(body.productId),
      sourceId: String(body.sourceId ?? "").trim(),
      acknowledged: body.acknowledged === true,
      typedConfirmation: String(body.typedConfirmation ?? ""),
      actorId: actor.id,
    });
    return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return safeErrorResponse(error, "Bukti media manual belum dapat disetujui.", 400);
  }
}
