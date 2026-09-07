import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { uploadSiteContentModel } from "@/features/site-content/site-content-model.service";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let actorId: string | null = null;
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.site-content.glb.upload"),
      limit: 8,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:content:update");
    actorId = actor.id;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw createApiError("VALIDATION_ERROR", "Pilih file GLB terlebih dahulu.", 400);
    }
    const result = await uploadSiteContentModel({ file, actorId: actor.id, request });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    if (actorId) {
      logAuditEvent({
        request,
        actorId,
        actorType: "internal",
        action: "site_content_glb_upload_failed",
        entityType: "site_content",
        entityId: "hero",
        metadata: { reason: "request_rejected" },
      });
    }
    return safeErrorResponse(error, "Model 3D belum dapat diunggah.", 400);
  }
}
