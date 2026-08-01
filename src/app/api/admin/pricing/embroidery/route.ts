import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { getGlobalEmbroideryPricing, updateGlobalEmbroideryPricing } from "@/features/embroidery-pricing/global-embroidery-pricing.service";
import { globalEmbroideryPricingPayloadSchema } from "@/features/embroidery-pricing/global-embroidery-pricing.validation";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.pricing.embroidery.list"), limit: 80, windowMs: 60_000 });
    requireInternalAdmin(request, "admin:catalog:view");
    const state = await getGlobalEmbroideryPricing();
    return NextResponse.json({ ok: true, ...state }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return safeErrorResponse(error, "Master harga bordir belum dapat dimuat.", 403);
  }
}

export async function PATCH(request: Request) {
  let actorId: string | null = null;
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.pricing.embroidery.update"), limit: 20, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:catalog:update");
    actorId = actor.id;
    const payload = validateInput(globalEmbroideryPricingPayloadSchema, await request.json().catch(() => ({})));
    const state = await updateGlobalEmbroideryPricing(payload);
    logAuditEvent({ request, actorId, actorType: "internal", action: "embroidery_pricing_updated", entityType: "embroidery_pricing", metadata: { zoneCount: state.zones.length, enabledCount: state.zones.filter((zone) => zone.enabled).length } });
    return NextResponse.json({ ok: true, ...state });
  } catch (error) {
    logAuditEvent({ request, actorId, actorType: "internal", action: "embroidery_pricing_update_failed", entityType: "embroidery_pricing" });
    return safeErrorResponse(error, "Master harga bordir belum dapat disimpan.", 403);
  }
}
