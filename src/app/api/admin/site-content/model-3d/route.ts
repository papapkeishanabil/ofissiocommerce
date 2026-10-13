import { NextResponse } from "next/server";
import { z } from "zod";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { uploadSiteContentModel } from "@/features/site-content/site-content-model.service";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const targetSchema = z.enum(["hero", "produk"]);

export async function POST(request: Request) {
  let actorId: string | null = null;
  let target = "hero";
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
    const parsedTarget = targetSchema.safeParse(form.get("target") ?? "hero");
    if (!parsedTarget.success) {
      throw createApiError("VALIDATION_ERROR", "Tujuan model 3D tidak valid.", 400);
    }
    target = parsedTarget.data;
    const result = await uploadSiteContentModel({
      file,
      actorId: actor.id,
      request,
      target: parsedTarget.data,
    });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    if (actorId) {
      logAuditEvent({
        request,
        actorId,
        actorType: "internal",
        action: "site_content_glb_upload_failed",
        entityType: "site_content",
        entityId: target,
        metadata: { reason: "request_rejected" },
      });
    }
    return safeErrorResponse(error, "Model 3D belum dapat diunggah.", 400);
  }
}
