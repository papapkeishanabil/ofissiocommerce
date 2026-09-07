import { NextResponse } from "next/server";
import { z } from "zod";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { applyMoqDefaultToProcessRoute } from "@/features/products/woocommerce/woocommerce-product-admin.service";
import { WOO_PROCESS_ROUTES } from "@/features/products/woocommerce/woocommerce-product-management.types";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

const bulkApplySchema = z.object({
  processRoute: z.enum(WOO_PROCESS_ROUTES),
  moq: z.number().int().min(1).max(1_000_000),
});

export async function POST(request: Request) {
  let actorId: string | null = null;
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.settings.moq.bulk_apply"), limit: 3, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:catalog:update");
    actorId = actor.id;
    const payload = validateInput(bulkApplySchema, await request.json().catch(() => ({})));
    const result = await applyMoqDefaultToProcessRoute({ ...payload, actorId, request });
    logAuditEvent({
      request,
      actorId,
      actorType: "internal",
      action: "moq_bulk_applied",
      entityType: "moq_settings",
      metadata: { processRoute: payload.processRoute, moq: payload.moq, updatedCount: result.updatedCount },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logAuditEvent({ request, actorId, actorType: "internal", action: "moq_bulk_apply_failed", entityType: "moq_settings" });
    return safeErrorResponse(error, "MOQ massal belum dapat diterapkan.", 403);
  }
}
