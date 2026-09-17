import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import {
  getSizeChartStandards,
  updateSizeChartStandards,
} from "@/features/size-charts/size-chart.service";
import { sizeChartStandardsPayloadSchema } from "@/features/size-charts/size-chart.validation";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.settings.size_charts.list"), limit: 80, windowMs: 60_000 });
    requireInternalAdmin(request, "admin:catalog:view");
    const state = await getSizeChartStandards();
    return NextResponse.json({ ok: true, ...state }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return safeErrorResponse(error, "Standar ukuran belum dapat dimuat.", 403);
  }
}

export async function PATCH(request: Request) {
  let actorId: string | null = null;
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.settings.size_charts.update"), limit: 20, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:catalog:update");
    actorId = actor.id;
    const payload = validateInput(sizeChartStandardsPayloadSchema, await request.json().catch(() => ({})));
    const state = await updateSizeChartStandards(payload.standards);
    logAuditEvent({
      request,
      actorId,
      actorType: "internal",
      action: "size_chart_standards_updated",
      entityType: "size_chart_standards",
      metadata: { count: state.standards.length, ids: state.standards.map((standard) => standard.id) },
    });
    return NextResponse.json({ ok: true, ...state });
  } catch (error) {
    logAuditEvent({ request, actorId, actorType: "internal", action: "size_chart_standards_update_failed", entityType: "size_chart_standards" });
    return safeErrorResponse(error, "Standar ukuran belum dapat disimpan.", 403);
  }
}
