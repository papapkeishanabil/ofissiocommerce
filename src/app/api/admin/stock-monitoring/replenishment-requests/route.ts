import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { requestProductionReplenishment } from "@/features/stock-monitoring/replenishment.service";
import { replenishmentRequestSchema } from "@/features/stock-monitoring/stock-monitoring.validation";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.stock.replenishment.create"),
      limit: 30,
      windowMs: 60_000,
    });
    const actor = requireInternalAdmin(request, "admin:stock:request");
    const payload = validateInput(
      replenishmentRequestSchema,
      await request.json().catch(() => null),
    );
    const result = await requestProductionReplenishment({
      ...payload,
      actorId: actor.id,
      request,
    });
    return NextResponse.json(
      { ok: true, ...result },
      { status: result.idempotent ? 200 : 201 },
    );
  } catch (error) {
    return safeErrorResponse(
      error,
      "Request produksi belum dapat dibuat.",
      500,
    );
  }
}
