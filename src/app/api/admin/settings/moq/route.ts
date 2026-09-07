import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { getMoqSettings, updateMoqSettings } from "@/features/moq-settings/moq-settings.service";
import { moqSettingsPayloadSchema } from "@/features/moq-settings/moq-settings.validation";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.settings.moq.list"), limit: 80, windowMs: 60_000 });
    requireInternalAdmin(request, "admin:catalog:view");
    const state = await getMoqSettings();
    return NextResponse.json({ ok: true, ...state }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return safeErrorResponse(error, "Master MOQ belum dapat dimuat.", 403);
  }
}

export async function PATCH(request: Request) {
  let actorId: string | null = null;
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.settings.moq.update"), limit: 20, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:catalog:update");
    actorId = actor.id;
    const payload = validateInput(moqSettingsPayloadSchema, await request.json().catch(() => ({})));
    const state = await updateMoqSettings(payload);
    logAuditEvent({ request, actorId, actorType: "internal", action: "moq_settings_updated", entityType: "moq_settings", metadata: { ...state.settings } });
    return NextResponse.json({ ok: true, ...state });
  } catch (error) {
    logAuditEvent({ request, actorId, actorType: "internal", action: "moq_settings_update_failed", entityType: "moq_settings" });
    return safeErrorResponse(error, "Master MOQ belum dapat disimpan.", 403);
  }
}
