import { NextResponse } from "next/server";
import { z } from "zod";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { analyzeIndustryInspirationImage } from "@/features/site-content/site-content-inspiration-analysis.service";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

const requestSchema = z.object({
  image: z.string().trim().min(1).max(500),
  title: z.string().trim().min(1).max(180),
  annotations: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(40),
        title: z.string().trim().min(1).max(90),
      }),
    )
    .min(1)
    .max(8),
});

export async function POST(request: Request) {
  let actorId: string | null = null;
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.site-content.inspiration.analyze"),
      limit: 10,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:content:update");
    actorId = actor.id;
    const input = validateInput(requestSchema, await request.json().catch(() => ({})));
    const result = await analyzeIndustryInspirationImage(input);
    logAuditEvent({
      request,
      actorId,
      actorType: "internal",
      action: "site_content_inspiration_analyzed",
      entityType: "site_content",
      entityId: "industri",
      metadata: {
        annotationCount: input.annotations.length,
        model: result.model,
      },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logAuditEvent({
      request,
      actorId,
      actorType: "internal",
      action: "site_content_inspiration_analysis_failed",
      entityType: "site_content",
      entityId: "industri",
      metadata: { reason: "request_rejected" },
    });
    return safeErrorResponse(error, "Gambar belum dapat dianalisis.", 500);
  }
}
