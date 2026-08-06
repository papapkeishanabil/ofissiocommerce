import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { pullInventoryByStockSku } from "@/features/integrations/ginee/ginee.service";
import { gineeInventoryQuerySchema } from "@/features/integrations/ginee/ginee.validation";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { parseQueryParams } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.ginee.inventory"), limit: 40, windowMs: 60_000 });
    requireInternalAdmin(request, "admin:integration:ginee:sync_read");
    const { sku } = parseQueryParams(gineeInventoryQuerySchema, request);
    const result = await pullInventoryByStockSku({ stockSku: sku });
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return safeErrorResponse(error, "Inventory Ginee belum dapat dimuat.", 403);
  }
}
