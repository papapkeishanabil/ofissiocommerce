import { NextResponse } from "next/server";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { adminWooProductIdParamSchema } from "@/features/admin/admin.validation";
import { getAdminProductGlbStatus } from "@/features/products/woocommerce/woocommerce-product-glb.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "admin.product.glb.status"),
      limit: 60,
      windowMs: 60_000,
    });
    requireInternalAdmin(request, "admin:catalog:view");
    const { id } = validateInput(adminWooProductIdParamSchema, await context.params);
    const status = await getAdminProductGlbStatus(id);
    return NextResponse.json({ ok: true, status }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return safeErrorResponse(error, "Status GLB belum dapat dimuat.", 400);
  }
}
