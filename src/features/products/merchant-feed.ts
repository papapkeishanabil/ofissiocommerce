import type { OfissioProduct } from "./product.types";
import type { WooCommerceProductVariation } from "./woocommerce/woocommerce.types";
import { linkedProductVariant, linkedVariantSelection, variantLink } from "./product-variant-links";
import { selectedColorVariant } from "./color-variants";
import { calculateQuantityTierPrice } from "./quantity-pricing";

export const MERCHANT_SITE = "https://ofissio.com";
export interface MerchantItem {
  id: string; group: string; title: string; description: string; link: string;
  image: string; price: number; availability: "in_stock" | "out_of_stock";
  color: string; size: string; gender: "male" | "female" | "unisex"; material?: string;
}
export interface MerchantResult {
  items: MerchantItem[];
  excluded: { product: string; sku?: string; reason: string }[];
}

function imageUrl(value: string | null | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value, MERCHANT_SITE);
    return url.protocol === "https:" && !url.username && !url.password &&
      ["ofissio.com", "woo.ofissio.com"].includes(url.hostname) ? url.href : undefined;
  } catch { return undefined; }
}

/** Export only native rows that the public product form can actually select. */
export function merchantProduct(product: OfissioProduct, rows: WooCommerceProductVariation[]): MerchantResult {
  const result: MerchantResult = { items: [], excluded: [] };
  const reject = (reason: string, sku?: string) => result.excluded.push({ product: product.slug, sku, reason });
  if (product.source !== "woocommerce" || product.status !== "published" || product.moq !== 1 ||
      product.transaction_mode === "REQUEST_QUOTATION" || product.stockVariantsReady === false ||
      (product.colorVariantsEnabled && !product.colorVariantsReady)) {
    reject("Product is not ready for single-item checkout"); return result;
  }
  // Simple products need an explicit size/color contract; do not invent a size matrix.
  if (!rows.length) { reject("No native selectable variants"); return result; }
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.status !== "publish" || !row.sku?.trim()) { reject("Unpublished or missing SKU", row.sku); continue; }
    const selection = linkedVariantSelection(product, row.sku);
    if (!selection?.size || !selection.color) { reject("Not selectable in storefront", row.sku); continue; }
    const generic = linkedProductVariant(product, row.sku);
    const canonicalId = generic?.id ?? (product.colorSizeVariantsEnabled
      ? product.colorSizeVariants?.find(item => item.sku === row.sku)?.id
      : product.purchaseVariants?.find(item => item.sku === row.sku)?.id);
    if (canonicalId !== row.id || seen.has(row.sku)) { reject("Ambiguous native variant", row.sku); continue; }
    seen.add(row.sku);
    const regular = generic?.regularPrice ?? product.priceFrom;
    const price = calculateQuantityTierPrice({ regularPrice: regular, totalQty: 1, quantityPricing: product.quantityPricing }).unitPrice;
    if (!Number.isFinite(price) || price <= 0 || Number(row.price) !== price || Number(row.regular_price) !== price) {
      reject("Native price does not match single-item storefront price", row.sku); continue;
    }
    if (row.stock_status !== "instock" && row.stock_status !== "outofstock") {
      reject("Stock status unknown or backorder date missing", row.sku); continue;
    }
    const image = imageUrl(generic?.imageSrc || selectedColorVariant(product, selection.color)?.imageSrc || product.mainImage || product.images?.[0]?.src);
    if (!image) { reject("Missing public product image", row.sku); continue; }
    const sleeve = selection.sleeve || product.sleeve_type;
    const sleeveCode = /panjang|long/i.test(sleeve) ? "long" : /pendek|short/i.test(sleeve) ? "short" : sleeve;
    const size = selection.size === "XXL" ? "2XL" : selection.size === "XXXL" ? "3XL" : selection.size;
    result.items.push({
      id: `ofs-${product.source_id}-${row.id}`, group: `ofs-${product.source_id}-${sleeveCode}`,
      title: `${product.name} - ${selection.color} - ${size}${selection.sleeve ? ` - ${selection.sleeve}` : ""}`.slice(0, 150),
      description: (product.short_description || product.description || product.name).slice(0, 5000),
      link: variantLink(`${MERCHANT_SITE}/product/${encodeURIComponent(product.slug)}`, row.sku), image,
      price, availability: row.stock_status === "instock" ? "in_stock" : "out_of_stock",
      color: selection.color, size, gender: product.gender === "men" ? "male" : product.gender === "women" ? "female" : "unisex",
      material: product.material,
    });
  }
  return result;
}

export function xmlText(value: string | number) {
  return String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function merchantXml(items: MerchantItem[]) {
  const tag = (name: string, value: string | number) => `<g:${name}>${xmlText(value)}</g:${name}>`;
  const body = items.map(item => `<item>${[
    tag("id", item.id), tag("item_group_id", item.group), tag("title", item.title),
    tag("description", item.description), tag("link", item.link), tag("image_link", item.image),
    tag("availability", item.availability), tag("price", `${item.price.toFixed(2)} IDR`),
    tag("condition", "new"), tag("brand", "Ofissio"), tag("color", item.color),
    tag("size", item.size), tag("gender", item.gender), tag("age_group", "adult"),
    item.material ? tag("material", item.material) : "",
  ].join("")}</item>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Ofissio</title><link>${MERCHANT_SITE}/</link><description>Produk Ofissio dari katalog aktif</description>\n${body}\n</channel></rss>`;
}
