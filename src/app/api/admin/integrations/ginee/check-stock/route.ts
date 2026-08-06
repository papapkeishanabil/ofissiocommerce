import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { checkGineeStock } from "@/features/integrations/ginee/ginee.service";
import { gineeStockCheckSchema } from "@/features/integrations/ginee/ginee.validation";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.ginee.check-stock"), limit: 40, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:integration:ginee:sync_read");
    const { sku } = validateInput(gineeStockCheckSchema, await request.json().catch(() => null));
    const result = await checkGineeStock({ stockSku: sku });
    logAuditEvent({
      request,
      actorId: actor.id,
      actorType: "internal",
      action: "ginee_stock_checked",
      entityType: "ginee_inventory",
      entityId: result.stockSku,
      metadata: { mapped: result.mapped, warehouseCount: result.inventory.length },
    });
    return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return safeErrorResponse(error, "Stok Ginee belum dapat diperiksa.", 403);
  }
}
