// src/app/api/admin/site-content/route.ts
// Admin CRUD for homepage content. Mirrors api/admin/pricing/embroidery/route.ts:
// rate-limit -> requireInternalAdmin -> validateInput -> service -> audit.
// The one addition is `revalidateTag("site-content")` after a successful PATCH,
// which invalidates the cached public read (site-content.service) and the Full
// Route Cache entry for "/" so the homepage reflects the edit on next request.

import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import {
  getSiteContent,
  updateSiteContent,
} from "@/features/site-content/site-content.service";
import { siteContentPayloadSchema } from "@/features/site-content/site-content.validation";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.site-content.list"),
      limit: 80,
      windowMs: 60_000,
    });
    requireInternalAdmin(request, "admin:content:view");
    const state = await getSiteContent();
    return NextResponse.json(
      { ok: true, ...state },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return safeErrorResponse(error, "Konten homepage belum dapat dimuat.", 403);
  }
}

export async function PATCH(request: Request) {
  let actorId: string | null = null;
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.site-content.update"),
      limit: 20,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:content:update");
    actorId = actor.id;
    const payload = validateInput(siteContentPayloadSchema, await request.json().catch(() => ({})));
    const result = await updateSiteContent(payload, actorId);
    // This is an admin read-your-write flow. Expire immediately instead of
    // serving the previous homepage content once via stale-while-revalidate.
    revalidateTag("site-content", { expire: 0 });
    // The homepage is prerendered. Invalidating only the data tag can leave its
    // Full Route Cache serving the previous media path after a content save.
    revalidatePath("/", "page");
    if (payload.section === "industri") {
      revalidatePath("/inspirasi", "page");
      revalidatePath("/inspirasi/[slug]", "page");
      revalidatePath("/inspirasi/bengkel-teknisi", "page");
    }
    logAuditEvent({
      request,
      actorId,
      actorType: "internal",
      action: "site_content_updated",
      entityType: "site_content",
      entityId: payload.section,
      metadata: { section: payload.section, ...result },
    });
    return NextResponse.json({ ok: true, section: payload.section, ...result });
  } catch (error) {
    logAuditEvent({
      request,
      actorId,
      actorType: "internal",
      action: "site_content_update_failed",
      entityType: "site_content",
    });
    return safeErrorResponse(error, "Konten homepage belum dapat disimpan.", 403);
  }
}
