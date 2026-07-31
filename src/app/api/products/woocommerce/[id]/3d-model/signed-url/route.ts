import { NextResponse } from "next/server";

import { adminWooProductIdParamSchema } from "@/features/admin/admin.validation";
import { resolvePublishedProductGlb } from "@/features/products/woocommerce/woocommerce-product-glb.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(request: Request, context: RouteContext) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "product.glb.signed-url"),
      limit: 90,
      windowMs: 60_000,
    });
    const { id } = validateInput(adminWooProductIdParamSchema, await context.params);
    const signed = await resolvePublishedProductGlb({ productId: id, request });
    return NextResponse.json(
      { ok: true, url: signed.url, expiresAt: signed.expiresAt },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return safeErrorResponse(error, "Model 3D produk belum tersedia.", 404);
  }
}
