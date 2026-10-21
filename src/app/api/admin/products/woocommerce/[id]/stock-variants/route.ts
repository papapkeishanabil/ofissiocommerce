import { NextResponse } from "next/server";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { adminWooProductIdParamSchema } from "@/features/admin/admin.validation";
import { readStockVariantEditor, saveStockVariantEdits, stockVariantEditsSchema } from "@/features/products/woocommerce/stock-variant-editor.service";
import { validateInput } from "@/lib/security/validate-input";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { logAuditEvent } from "@/lib/security/audit-log";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireInternalAdmin(request, "admin:catalog:view");
    const { id } = validateInput(adminWooProductIdParamSchema, await context.params);
    return NextResponse.json({ ok: true, rows: await readStockVariantEditor(id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return safeErrorResponse(error, "SKU stok belum dapat dibaca.", 400); }
}
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = requireInternalAdmin(request, "admin:catalog:update");
    rateLimitOrThrow({ key: createRateLimitKey(request, "admin.products.stock-variants"), limit: 10, windowMs: 60_000 });
    const { id } = validateInput(adminWooProductIdParamSchema, await context.params);
    const input = validateInput(stockVariantEditsSchema, await request.json().catch(() => null));
    const rows = await saveStockVariantEdits(id, input);
    logAuditEvent({ request, actorId: actor.id, actorType: "internal", action: "product_stock_skus_updated", entityType: "product", entityId: String(id), metadata: { count: rows.length } });
    return NextResponse.json({ ok: true, rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return safeErrorResponse(error, "SKU stok belum dapat disimpan.", 400); }
}
