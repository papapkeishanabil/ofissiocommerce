import { NextResponse } from "next/server";

import { listAdminProcessOrders, requireInternalAdmin } from "@/features/admin/admin.service";
import { processOrderListQuerySchema } from "@/features/process-orders/process-order.validation";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { parseQueryParams } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.process-orders.list"),
      limit: 80,
      windowMs: 60_000,
    });
    requireInternalAdmin(request, "admin:process-order:view");
    const query = parseQueryParams(processOrderListQuerySchema, request);
    const rows = await listAdminProcessOrders();
    const processOrders = rows
      .filter((row) => (query.companyId ? row.companyId === query.companyId : true))
      .filter((row) => (query.processRoute ? row.processRoute === query.processRoute : true))
      .filter((row) => (query.processStatus ? row.processStatus === query.processStatus : true));
    return NextResponse.json({ ok: true, processOrders });
  } catch (error) {
    return safeErrorResponse(error, "Process orders belum dapat dimuat.", 403);
  }
}
