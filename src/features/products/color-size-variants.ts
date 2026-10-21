import type { OfissioProduct } from "./product.types";
import type { WooCommerceProduct, WooCommerceProductVariation } from "./woocommerce/woocommerce.types";
import { getMetaBoolean, getMetaString, getMetaValue } from "./woocommerce/woocommerce-product-meta";
import { sizeStockSku } from "@/features/stock-monitoring/product-size-stock.types";

export const COLOR_SIZE_ENABLED_META = "ofissio_color_size_variants_enabled";
export const COLOR_SIZE_ROWS_META = "ofissio_color_size_variants";
export const COLOR_SIZE_MARKER = "ofissio_color_size_variant";
export const COLOR_SKU_META = "ofissio_color_sku";
export interface ColorSizeVariant { id: number; color: string; size: string; sku: string }
export interface SelectedSizeVariant { variationId: number; size: string; sku: string; quantity: number }
export function stockSize(size: string) {
  const value = size.trim().toUpperCase();
  return value === "2XL" ? "XXL" : value === "XXXL" ? "3XL" : value;
}
export function mapNativeColorSizeVariants(rows: WooCommerceProductVariation[]): ColorSizeVariant[] {
  return rows.filter(row => row.status === "publish" && getMetaBoolean(row.meta_data ?? [], COLOR_SIZE_MARKER, false)).map(row => ({
    id: row.id, sku: row.sku, color: getMetaString(row.meta_data ?? [], "ofissio_color"),
    size: stockSize(row.attributes?.find(attribute => /^(pa_)?(size|ukuran)$/i.test(attribute.name ?? ""))?.option || getMetaString(row.meta_data ?? [], "ofissio_size")),
  }));
}
export function readColorSizeVariants(product: WooCommerceProduct): ColorSizeVariant[] {
  let value = getMetaValue(product.meta_data ?? [], COLOR_SIZE_ROWS_META);
  if (typeof value === "string") { try { value = JSON.parse(value); } catch { return []; } }
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is ColorSizeVariant => row && Number.isInteger(row.id) && row.id > 0 && typeof row.color === "string" && typeof row.size === "string" && typeof row.sku === "string" && !!row.sku);
}
export function selectColorSizeVariants(product: OfissioProduct, color: string, sizes: Record<string, number>): SelectedSizeVariant[] | undefined {
  if (!product.colorSizeVariantsEnabled) return undefined;
  const selected: SelectedSizeVariant[] = [];
  for (const [size, quantity] of Object.entries(sizes)) {
    if (!(quantity > 0)) continue;
    const row = product.colorSizeVariants?.find(row => row.color.trim().toLowerCase() === color.trim().toLowerCase() && stockSize(row.size) === stockSize(size));
    if (!row) throw new Error(`Varian ${color} ukuran ${size} belum tersedia. Muat ulang produk.`);
    selected.push({ variationId: row.id, size, sku: row.sku, quantity });
  }
  return selected;
}
export const colorSizeSku = (colorSku: string, size: string) => sizeStockSku(colorSku, stockSize(size));
