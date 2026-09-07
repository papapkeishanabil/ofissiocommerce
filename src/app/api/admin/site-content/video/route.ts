import { NextResponse } from "next/server";
import { z } from "zod";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { uploadSiteContentVideo } from "@/features/site-content/site-content-video.service";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const scopeSchema = z.enum(["hero", "bordir"]);

export async function POST(request: Request) {
  let actorId: string | null = null;
  let entityId = "unknown";
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.site-content.video.upload"),
      limit: 8,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:content:update");
    actorId = actor.id;
    const form = await request.formData();
    const file = form.get("file");
    const scope = scopeSchema.safeParse(form.get("scope"));
    if (!scope.success) throw createApiError("VALIDATION_ERROR", "Tujuan video tidak valid.", 400);
    entityId = scope.data;
    if (!(file instanceof File) || file.size === 0) {
      throw createApiError("VALIDATION_ERROR", "Pilih file video terlebih dahulu.", 400);
    }
    const result = await uploadSiteContentVideo({ file, scope: scope.data, actorId: actor.id, request });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    if (actorId) {
      logAuditEvent({
        request,
        actorId,
        actorType: "internal",
        action: "site_content_video_upload_failed",
        entityType: "site_content",
        entityId,
        metadata: { reason: "request_rejected" },
      });
    }
    return safeErrorResponse(error, "Video belum dapat diunggah.", 400);
  }
}
