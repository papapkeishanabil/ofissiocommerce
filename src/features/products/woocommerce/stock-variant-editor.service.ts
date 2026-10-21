import "server-only";
import { z } from "zod";
import { woocommerceClient } from "./woocommerce.client";
import { listColorVariationRows, type VariantSource } from "./color-variants.service";
import { assertFreeStockSkus, STOCK_SIZES } from "./size-variants.service";
import { stockSize } from "../color-size-variants";
import { createApiError } from "@/lib/security/safe-error-response";

export const stockVariantEditsSchema = z.object({ rows: z.array(z.object({ id: z.number().int().positive(), sku: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9._-]+$/), size: z.enum(["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"]) })).min(1).max(300) }).superRefine((value, ctx) => {
  if (new Set(value.rows.map(r => r.id)).size !== value.rows.length || new Set(value.rows.map(r => r.sku.toUpperCase())).size !== value.rows.length) ctx.addIssue({ code: "custom", message: "ID dan SKU varian tidak boleh duplikat." });
});

export async function readStockVariantEditor(id: number, source: VariantSource = woocommerceClient) {
  const product = await source.getProductById(id);
  const rows = product.type === "variable" ? await listColorVariationRows(id, source) : [];
  return rows.filter(row => row.status === "publish").map(row => ({
    id: row.id, sku: row.sku === product.sku ? "" : row.sku,
    size: stockSize(row.attributes?.find(a => /^(pa_)?(ukuran|size)$/i.test(a.name || ""))?.option || row.sku?.match(/-(XS|S|M|L|XL|XXL|2XL|3XL|XXXL|4XL|5XL)$/i)?.[1] || ""),
    label: row.attributes?.filter(a => !/^(pa_)?(ukuran|size)$/i.test(a.name || "")).map(a => a.option).filter(Boolean).join(" / ") || product.name,
    quantity: typeof row.stock_quantity === "number" && row.manage_stock ? row.stock_quantity : null,
  }));
}

export async function saveStockVariantEdits(id: number, input: z.infer<typeof stockVariantEditsSchema>, source: VariantSource = woocommerceClient) {
  const product = await source.getProductById(id);
  const native = await listColorVariationRows(id, source);
  const active = native.filter(row => row.status === "publish");
  if (input.rows.length !== active.length || input.rows.some(row => !active.some(v => v.id === row.id))) throw createApiError("VALIDATION_ERROR", "Daftar varian berubah. Muat ulang halaman sebelum menyimpan.", 409);
  const attr = product.attributes?.find(a => /^(pa_)?(ukuran|size)$/i.test(a.slug || a.name));
  if (!attr) throw createApiError("VALIDATION_ERROR", "Tambahkan atribut ukuran pada produk terlebih dahulu.", 400);
  if (input.rows.some(row => row.sku.toUpperCase() === product.sku.toUpperCase())) throw createApiError("VALIDATION_ERROR", "SKU stok harus berbeda dari SKU induk.", 400);
  await assertFreeStockSkus(input.rows, source);
  // Check unique identities (all other attributes + size) before writing any row.
  const identities = input.rows.map(row => {
    const original = active.find(v => v.id === row.id)!;
    return JSON.stringify([row.size, original.attributes?.filter(a => !/^(pa_)?(ukuran|size)$/i.test(a.name || "")).map(a => [a.id || a.name, a.option]).sort()]);
  });
  if (new Set(identities).size !== identities.length) throw createApiError("VALIDATION_ERROR", "Dua varian memiliki pilihan dan ukuran yang sama. Periksa pemetaan ukuran.", 400);
  const sizes = STOCK_SIZES.filter(size => input.rows.some(row => row.size === size));
  await source.updateProduct(id, { attributes: product.attributes!.map(a => ({ ...(a.id ? { id: a.id } : { name: a.name }), options: a === attr ? sizes : a.options ?? [], variation: a === attr || a.variation === true, visible: a.visible ?? true })), meta_data: [{ key: "ofissio_purchase_variants_enabled", value: true }, { key: "available_sizes", value: JSON.stringify(sizes) }] });
  for (const row of input.rows) {
    const original = active.find(v => v.id === row.id)!;
    const attributes = [...(original.attributes ?? []).filter(a => !/^(pa_)?(ukuran|size)$/i.test(a.name || "")).map(a => ({ ...(a.id ? { id: a.id } : { name: a.name }), option: a.option })), { ...(attr.id ? { id: attr.id } : { name: attr.name }), option: row.size }];
    await source.updateProductVariation(id, row.id, { sku: row.sku, attributes, meta_data: [{ key: "ofissio_stock_sku_override", value: true }, { key: "ofissio_size", value: row.size }] });
  }
  const fresh = await listColorVariationRows(id, source);
  for (const row of input.rows) {
    const saved = fresh.find(v => v.id === row.id);
    if (!saved || saved.sku !== row.sku) throw createApiError("PROVIDER_ERROR", "SKU belum terverifikasi. Muat ulang dan periksa kembali.", 502);
  }
  await source.updateProduct(id, { meta_data: [{ key: "ofissio_stock_variants_ready", value: true }] });
  return readStockVariantEditor(id, source);
}
