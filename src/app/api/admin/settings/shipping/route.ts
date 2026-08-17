import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { getShippingSettingsAdminState, updateShippingSettings } from "@/features/shipping-settings/shipping-settings.service";
import { shippingSettingsPayloadSchema } from "@/features/shipping-settings/shipping-settings.validation";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.settings.shipping.read"), limit: 40, windowMs: 60_000 });
    requireInternalAdmin(request, "admin:settings:view");
    const state = await getShippingSettingsAdminState();
    return NextResponse.json({ ok: true, ...state }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return safeErrorResponse(error, "Pengaturan kurir belum dapat dimuat.", 403);
  }
}

export async function PATCH(request: Request) {
  let actorId: string | null = null;
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.settings.shipping.update"), limit: 20, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:settings:update");
    actorId = actor.id;
    const payload = validateInput(shippingSettingsPayloadSchema, await request.json().catch(() => ({})));
    const settings = await updateShippingSettings(payload.enabledServices, actorId);
    logAuditEvent({ request, actorId, actorType: "internal", action: "shipping_settings_updated", entityType: "shipping_settings", entityId: "default", metadata: { enabledServiceCount: settings.enabledServices.length } });
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    logAuditEvent({ request, actorId, actorType: "internal", action: "shipping_settings_update_failed", entityType: "shipping_settings", entityId: "default" });
    return safeErrorResponse(error, "Pengaturan kurir belum dapat disimpan.", 403);
  }
}
