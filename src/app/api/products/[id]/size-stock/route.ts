import { NextResponse } from "next/server";
import { woocommerceProductRepository } from "@/features/products/repositories/woocommerce-product.repository";
import { getProductSizeStock } from "@/features/stock-monitoring/product-size-stock.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";
const pending = new Map<string, { expires: number; value: ReturnType<typeof getProductSizeStock> }>();

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "products.size-stock"), limit: 60, windowMs: 60_000 });
    const { id } = await context.params;
    const color = new URL(request.url).searchParams.get("color")?.trim() || "";
    const sleeve = new URL(request.url).searchParams.get("sleeve")?.trim() || undefined;
    if (sleeve && sleeve.length > 100) throw createApiError("VALIDATION_ERROR", "Jenis lengan tidak valid.", 400);
    if (!/^(wc-)?\d{1,10}$/.test(id) || !color || color.length > 100) throw createApiError("VALIDATION_ERROR", "Produk atau warna tidak valid.", 400);
    const key = JSON.stringify([id.replace(/^wc-/, ""), color.toLowerCase(), sleeve]);
    let entry = pending.get(key);
    if (!entry || entry.expires <= Date.now()) {
      const product = await woocommerceProductRepository.getProductById(id);
      if (!product || product.status !== "published") throw createApiError("NOT_FOUND", "Produk tidak ditemukan.", 404);
      if (pending.size >= 200) pending.clear();
      const value = getProductSizeStock(product, color, undefined, sleeve);
      entry = { expires: Date.now() + 15_000, value };
      pending.set(key, entry);
      value.catch(() => { if (pending.get(key)?.value === value) pending.delete(key); });
    }
    return NextResponse.json({ ok: true, stock: await entry.value }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return safeErrorResponse(error, "Stok belum dapat diperiksa.");
  }
}
