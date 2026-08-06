import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { listGineeMappings, saveGineeMapping } from "@/features/integrations/ginee/ginee.service";
import { gineeMappingSchema } from "@/features/integrations/ginee/ginee.validation";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.ginee.mappings.list"), limit: 60, windowMs: 60_000 });
    requireInternalAdmin(request, "admin:integration:ginee:view");
    const mappings = await listGineeMappings();
    return NextResponse.json({ ok: true, mappings }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return safeErrorResponse(error, "Mapping Ginee belum dapat dimuat.", 403);
  }
}

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.ginee.mappings.save"), limit: 30, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:integration:ginee:update");
    const payload = validateInput(gineeMappingSchema, await request.json().catch(() => null));
    const mapping = await saveGineeMapping(payload);
    logAuditEvent({
      request,
      actorId: actor.id,
      actorType: "internal",
      action: "ginee_mapping_saved",
      entityType: "ginee_mapping",
      entityId: mapping.id,
      metadata: { stockSku: mapping.stockSku, gineeSku: mapping.gineeSku },
    });
    return NextResponse.json({ ok: true, mapping }, { status: 201 });
  } catch (error) {
    return safeErrorResponse(error, "Mapping Ginee belum dapat disimpan.", 403);
  }
}
