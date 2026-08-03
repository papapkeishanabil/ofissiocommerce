import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { getGlobalTaxSettings, updateGlobalTaxSettings } from "@/features/tax/tax.service";
import { taxSettingsPayloadSchema } from "@/features/tax/tax.validation";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.settings.tax.read"), limit: 80, windowMs: 60_000 });
    requireInternalAdmin(request, "admin:tax:view");
    const state = await getGlobalTaxSettings();
    return NextResponse.json({ ok: true, ...state }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return safeErrorResponse(error, "Pengaturan PPN belum dapat dimuat.", 403);
  }
}

export async function PATCH(request: Request) {
  let actorId: string | null = null;
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.settings.tax.update"), limit: 20, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:tax:update");
    actorId = actor.id;
    const payload = validateInput(taxSettingsPayloadSchema, await request.json().catch(() => ({})));
    const state = await updateGlobalTaxSettings(payload);
    logAuditEvent({
      request,
      actorId,
      actorType: "internal",
      action: "tax_settings_updated",
      entityType: "tax_settings",
      entityId: "default",
      metadata: { enabled: state.settings.enabled, rate: state.settings.rate, label: state.settings.label },
    });
    return NextResponse.json({ ok: true, ...state });
  } catch (error) {
    logAuditEvent({ request, actorId, actorType: "internal", action: "tax_settings_update_failed", entityType: "tax_settings", entityId: "default" });
    return safeErrorResponse(error, "Pengaturan PPN belum dapat disimpan.", 403);
  }
}
