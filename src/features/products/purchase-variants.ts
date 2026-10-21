import type { OfissioProduct } from "./product.types";
import type { WooCommerceProductVariation } from "./woocommerce/woocommerce.types";
import type { SelectedSizeVariant } from "./color-size-variants";
import { stockSize } from "./color-size-variants";

export interface PurchaseVariant { id: number; sku: string; size: string; sleeve: string; color?: string }
export const PURCHASE_VARIANTS_META = "ofissio_live_purchase_variants";

/** Read actual native SKUs; never guess a sleeve prefix or reuse another size. */
export function mapPurchaseVariants(rows: WooCommerceProductVariation[]): PurchaseVariant[] {
  return rows.filter(row => row.status === "publish").flatMap(row => {
    const suffix = row.sku?.match(/-(XS|S|M|L|XL|XXL|2XL|3XL|XXXL|4XL|5XL)$/i)?.[1];
    const attribute = row.attributes?.find(a => /^(pa_)?(ukuran|size)$/i.test(a.name || ""))?.option;
    const size = stockSize(attribute || suffix || "");
    if (!row.sku || !["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"].includes(size)) return [];
    const sleeve = row.attributes?.find(a => /^(pa_)?(panjang[-_ ]lengan|tipe[-_ ]lengan|sleeve)$/i.test(a.name || ""))?.option || "";
    const color = row.attributes?.find(a => /^(pa_)?(warna|color)$/i.test(a.name || ""))?.option || "";
    return [{ id: row.id, sku: row.sku, size, sleeve, ...(color ? { color } : {}) }];
  });
}

export function sleeveOptions(product: OfissioProduct): string[] {
  return [...new Set((product.purchaseVariants ?? []).map(row => row.sleeve).filter(Boolean))];
}

export function matchingPurchaseVariant(product: OfissioProduct, size: string, sleeve?: string, color?: string) {
  const options = sleeveOptions(product);
  if (options.length && !options.includes(sleeve || "")) return undefined;
  const key = (value: string) => value.trim().toLowerCase().replace(/[\s_-]+/g, "");
  const matches = (product.purchaseVariants ?? []).filter(row => stockSize(row.size) === stockSize(size) && (!options.length || row.sleeve === sleeve) && (!row.color || !!color && key(row.color) === key(color)));
  if (matches.length === 1) return matches[0];
  const sameBase = matches.filter(row => row.sku.replace(/-(XS|S|M|L|XL|XXL|2XL|3XL|XXXL|4XL|5XL)$/i, "").toUpperCase() === product.sku.toUpperCase());
  return sameBase.length === 1 ? sameBase[0] : undefined;
}

export function selectPurchaseVariants(product: OfissioProduct, sizes: Record<string, number>, sleeve?: string, color?: string): SelectedSizeVariant[] | undefined {
  if (!product.purchaseVariants?.length || product.colorSizeVariantsEnabled) return undefined;
  if (sleeveOptions(product).length && !sleeveOptions(product).includes(sleeve || "")) throw new Error("Pilih jenis lengan sebelum memesan.");
  return Object.entries(sizes).filter(([, qty]) => qty > 0).map(([size, quantity]) => {
    const row = matchingPurchaseVariant(product, size, sleeve, color);
    if (!row) throw new Error(`SKU ukuran ${size} belum tersedia atau tidak unik. Muat ulang produk.`);
    return { variationId: row.id, sku: row.sku, size, quantity };
  });
}
