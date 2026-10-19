import type { OfissioProduct, ProductImageReference } from "./product.types";
import type { WooCommerceProduct, WooCommerceProductVariation } from "./woocommerce/woocommerce.types";
import { getMetaBoolean, getMetaString, getMetaValue } from "./woocommerce/woocommerce-product-meta";
import { toProxiedWordPressMediaUrl } from "./woocommerce/wordpress-media-proxy";

export const COLOR_VARIANTS_META = "ofissio_color_variants";
export const COLOR_VARIANTS_ENABLED_META = "ofissio_color_variants_enabled";
export const COLOR_VARIANTS_READY_META = "ofissio_color_variants_ready";
export const COLOR_VARIANT_MARKER = "ofissio_color_variant";
export const BASE_PRICE_META = "ofissio_base_regular_price";
export const DEFAULT_COLOR_META = "ofissio_default_color";

export interface ProductColorVariant {
  id: number;
  color: string;
  sku: string;
  imageSrc: string;
  /** null means stock is not tracked; otherwise stock is shared by all sizes. */
  stockQuantity: number | null;
}

export interface ColorVariantInput extends Omit<ProductColorVariant, "id"> {
  id?: number;
}

export function colorKey(value: string) {
  return value.trim().toLocaleLowerCase("id-ID");
}

export function isManagedColorVariant(variation: WooCommerceProductVariation) {
  return getMetaBoolean(variation.meta_data ?? [], COLOR_VARIANT_MARKER, false);
}

export function mapNativeColorVariants(product: WooCommerceProduct, rows: WooCommerceProductVariation[]): ProductColorVariant[] {
  const colorAttribute = product.attributes?.find((attribute) => /^(pa_)?(warna|color)$/i.test(attribute.slug || attribute.name));
  return rows.filter((row) => row.status === "publish" && isManagedColorVariant(row)).map((row) => ({
    id: row.id,
    color: row.attributes?.find((attribute) =>
      (colorAttribute?.id && attribute.id === colorAttribute.id) || /^(pa_)?(warna|color)$/i.test(attribute.name ?? ""),
    )?.option || getMetaString(row.meta_data ?? [], "ofissio_color"),
    sku: row.sku,
    imageSrc: toProxiedWordPressMediaUrl(row.image?.src ?? "", process.env.WORDPRESS_MEDIA_BASE_URL?.trim() ?? ""),
    stockQuantity: row.manage_stock && row.stock_quantity != null ? row.stock_quantity : null,
  }));
}

export function readColorVariants(product: WooCommerceProduct): ProductColorVariant[] {
  let value = getMetaValue(product.meta_data ?? [], COLOR_VARIANTS_META);
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { return []; }
  }
  if (!Array.isArray(value)) return [];
  return value.flatMap((row: Partial<ProductColorVariant> | null) => {
    if (!row || !Number.isInteger(row.id) || (row.id ?? 0) <= 0 || typeof row.color !== "string" || typeof row.sku !== "string" || !row.sku.trim() || typeof row.imageSrc !== "string") return [];
    return [{
      id: row.id!, color: row.color, sku: row.sku,
      imageSrc: toProxiedWordPressMediaUrl(row.imageSrc, process.env.WORDPRESS_MEDIA_BASE_URL?.trim() ?? ""),
      stockQuantity: typeof row.stockQuantity === "number" && Number.isFinite(row.stockQuantity) ? row.stockQuantity : null,
    }];
  });
}

export function selectedColorVariant(product: Pick<OfissioProduct, "colorVariants">, color: string) {
  return product.colorVariants?.find((variant) => colorKey(variant.color) === colorKey(color));
}

export function colorVariantSnapshot(product: OfissioProduct, color: string) {
  const variant = selectedColorVariant(product, color);
  return {
    sku: variant?.sku ?? product.sku,
    image: variant?.imageSrc || product.mainImage || null,
    variationId: variant?.id,
    parentSku: variant ? product.sku : undefined,
  };
}

export function colorVariantIssue(product: OfissioProduct, color: string) {
  if (!product.available_colors.some((item) => colorKey(item) === colorKey(color))) return "Warna produk tidak tersedia.";
  if (!product.colorVariantsEnabled) return null;
  if (!product.colorVariantsReady) return "Varian warna belum selesai disimpan. Silakan muat ulang produk atau hubungi tim Ofissio.";
  if (!selectedColorVariant(product, color)) return "Varian warna ini tidak tersedia. Silakan pilih warna lain.";
  return null;
}

export function colorVariantGallery(product: OfissioProduct, color: string): ProductImageReference[] {
  const images = product.images ?? [];
  const variant = selectedColorVariant(product, color);
  if (!variant?.imageSrc) return images;
  const existing = images.find((image) => image.src === variant.imageSrc);
  const primary = existing ?? { id: null, src: variant.imageSrc, name: `${product.name} ${color}`, alt: `${product.name} warna ${color}` };
  return [primary, ...images.filter((image) => image.src !== variant.imageSrc)];
}
