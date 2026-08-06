import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { getGineeOrderDetail } from "@/features/integrations/ginee/ginee.service";
import { gineeOrderIdSchema } from "@/features/integrations/ginee/ginee.validation";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";
interface RouteContext { params: Promise<{ id: string }> }

export async function GET(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.ginee.order.detail"), limit: 40, windowMs: 60_000 });
    requireInternalAdmin(request, "admin:integration:ginee:sync_read");
    const { id } = validateInput(gineeOrderIdSchema, await context.params);
    const result = await getGineeOrderDetail({ orderId: id });
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return safeErrorResponse(error, "Detail order Ginee belum dapat dimuat.", 403);
  }
}
