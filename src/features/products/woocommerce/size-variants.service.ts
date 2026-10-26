import "server-only";
import { stockSize } from "../color-size-variants";
import { mapPurchaseVariants } from "../purchase-variants";
import { listColorVariationRows, type VariantSource } from "./color-variants.service";
import { getMetaBoolean, getMetaString, getMetaStringArray } from "./woocommerce-product-meta";
import type { WooCommerceProduct } from "./woocommerce.types";
import { createApiError } from "@/lib/security/safe-error-response";

export const STOCK_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"];
export const stockVariantSize = (value: string) => stockSize(value);

/** Single-color products get native size SKUs at creation, not synthetic UI SKUs. */
export async function ensureSizeVariants(product: WooCommerceProduct, source: VariantSource) {
  if (getMetaString(product.meta_data ?? [], "ofissio_product_kind")) return;
  if (getMetaBoolean(product.meta_data ?? [], "ofissio_color_variants_enabled", false)) return;
  const sizes = [...new Set(getMetaStringArray(product.meta_data ?? [], "available_sizes").map(stockSize))];
  const colors = getMetaStringArray(product.meta_data ?? [], "available_colors");
  if (!sizes.length || sizes.some(size => !STOCK_SIZES.includes(size)) || colors.length > 1) return;
  const rows = product.type === "variable" ? await listColorVariationRows(product.id, source) : [];
  const active = rows.filter(row => row.status === "publish");
  const mapped = mapPurchaseVariants(active);
  // Unknown identities need explicit SKU/size mapping in the editor, not a guessed order.
  if (active.length && mapped.length !== active.length) return;
  // Multi-axis variations are preserved. No automatic expansion across sleeves/colors.
  if (mapped.some(row => row.sleeve || row.color)) return;
  const price = Number(product.regular_price || product.price);
  if (!(price > 0)) return;
  const sizeAttribute = product.attributes?.find(a => /^(pa_)?(ukuran|size)$/i.test(a.slug || a.name));
  if (!sizeAttribute) throw createApiError("VALIDATION_ERROR", "Atribut ukuran produk belum tersedia.", 400);
  const plans = sizes.filter(size => !mapped.some(row => stockSize(row.size) === size)).map(size => ({ size, sku: `${product.sku}-${size}`.toUpperCase() }));
  await assertFreeStockSkus(plans.map(p => ({ sku: p.sku })), source);
  await source.updateProduct(product.id, { type: "variable", attributes: (product.attributes ?? []).map(a => ({ ...(a.id ? { id: a.id } : { name: a.name }), visible: a.visible ?? true, variation: a === sizeAttribute || a.variation === true, options: a === sizeAttribute ? sizes : a.options ?? [] })), meta_data: [{ key: "ofissio_purchase_variants_enabled", value: true }, { key: "ofissio_stock_variants_ready", value: false }] });
  for (const plan of plans) await source.createProductVariation(product.id, { sku: plan.sku, status: "publish", regular_price: String(price), manage_stock: false, stock_quantity: null, stock_status: "instock", attributes: [{ ...(sizeAttribute.id ? { id: sizeAttribute.id } : { name: sizeAttribute.name }), option: plan.size }] });
  const fresh = await listColorVariationRows(product.id, source);
  if (plans.some(plan => !fresh.some(row => row.status === "publish" && row.sku === plan.sku))) throw createApiError("VALIDATION_ERROR", "SKU ukuran belum terverifikasi. Simpan ulang produk untuk melanjutkan.", 502);
  await source.updateProduct(product.id, { meta_data: [{ key: "ofissio_stock_variants_ready", value: true }] });
}

export async function assertFreeStockSkus(plans: { sku: string; id?: number }[], source: VariantSource) {
  const keys = plans.map(p => p.sku.toUpperCase());
  if (new Set(keys).size !== keys.length) throw createApiError("VALIDATION_ERROR", "SKU stok tidak boleh duplikat.", 400);
  if (!source.getProducts) return;
  for (let offset = 0; offset < plans.length; offset += 40) {
    const batch = plans.slice(offset, offset + 40);
    const occupied = await source.getProducts({ sku: batch.map(p => p.sku).join(","), status: "any", per_page: 100 });
    const conflict = batch.find(p => occupied.some(row => row.sku.toUpperCase() === p.sku.toUpperCase() && row.id !== p.id));
    if (conflict) throw createApiError("VALIDATION_ERROR", `SKU ${conflict.sku} sudah dipakai produk atau varian lain.`, 400);
  }
}
