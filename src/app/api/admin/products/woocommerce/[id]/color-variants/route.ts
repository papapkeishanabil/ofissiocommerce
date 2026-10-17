import { NextResponse } from "next/server";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { adminWooProductIdParamSchema } from "@/features/admin/admin.validation";
import { saveColorVariants } from "@/features/products/woocommerce/color-variants.service";
import { adminColorVariantsSchema } from "@/features/products/woocommerce/color-variants.validation";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.products.color-variants"), limit: 20, windowMs: 60_000 });
    const actor = requireInternalAdmin(request, "admin:catalog:update");
    const { id } = validateInput(adminWooProductIdParamSchema, await context.params);
    const input = validateInput(adminColorVariantsSchema, await request.json().catch(() => null));
    const variants = await saveColorVariants(id, input);
    logAuditEvent({ request, actorId: actor.id, actorType: "internal", action: "product_color_variants_updated", entityType: "product", entityId: String(id), metadata: { count: variants.length } });
    return NextResponse.json({ ok: true, variants }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return safeErrorResponse(error, "Varian warna belum dapat disimpan. Periksa SKU dan foto, lalu simpan ulang.", 400);
  }
}
