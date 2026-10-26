import { NextResponse } from "next/server";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { adminWooProductIdParamSchema } from "@/features/admin/admin.validation";
import { saveProductVariants } from "@/features/products/woocommerce/product-variants.service";
import { productVariantsSchema } from "@/features/products/product-variants";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.products.variants"), limit: 20, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:catalog:update");
    const { id } = validateInput(adminWooProductIdParamSchema, await context.params);
    const input = validateInput(productVariantsSchema, await request.json().catch(() => null));
    const variants = await saveProductVariants(id, input);
    logAuditEvent({ request, actorId: actor.id, actorType: "internal", action: "product_variants_updated", entityType: "product", entityId: String(id), metadata: { count: variants.length } });
    return NextResponse.json({ ok: true, variants }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return safeErrorResponse(error, "Varian belum dapat disimpan. Periksa kombinasi, SKU dan foto, lalu simpan ulang.", 400);
  }
}
