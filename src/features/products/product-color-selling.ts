import type { OfissioProduct } from "./product.types";
import type { WooCommerceProduct, WooCommerceProductVariation } from "./woocommerce/woocommerce.types";
import { getMetaString, getMetaStringArray } from "./woocommerce/woocommerce-product-meta";

/** Sales availability is independent of inventory and never deletes a native SKU. */
export const INACTIVE_PRODUCT_COLORS_META = "ofissio_inactive_colors";
export const sellingColorKey = (value: string) => value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");
const isColorName = (name: string) => /^(pa_)?(warna|color)$/i.test(name.trim());

export function readInactiveProductColors(product: Pick<WooCommerceProduct, "meta_data">) {
  return [...new Map(getMetaStringArray(product.meta_data ?? [], INACTIVE_PRODUCT_COLORS_META)
    .map(color => [sellingColorKey(color), color.trim()])).values()];
}

export function isProductColorActive(product: { inactiveColors?: readonly string[] }, color: string) {
  return !product.inactiveColors?.some(inactive => sellingColorKey(inactive) === sellingColorKey(color));
}

/** Use only for customer offers; admin editors must still receive every native row. */
export function saleableColorVariationRows(product: WooCommerceProduct, rows: WooCommerceProductVariation[]) {
  const inactiveColors = readInactiveProductColors(product);
  const colorAttribute = product.attributes?.find(attribute => isColorName(attribute.slug || attribute.name));
  return rows.filter(row => {
    const color = row.attributes?.find(attribute =>
      Boolean(colorAttribute?.id && attribute.id === colorAttribute.id) || isColorName(attribute.name ?? ""),
    )?.option || getMetaString(row.meta_data ?? [], "ofissio_color");
    return isProductColorActive({ inactiveColors }, color);
  });
}

/** Customer projection only. Raw WooCommerce/admin data remains complete and reversible. */
export function applyProductColorSellingStatus(product: OfissioProduct, inactiveColors: string[]): OfissioProduct {
  if (!inactiveColors.length) return { ...product, inactiveColors };
  const active = (color: string) => isProductColorActive({ inactiveColors }, color);
  const colorOf = (options: Record<string, string>) => Object.entries(options).find(([name]) => isColorName(name))?.[1] ?? "";
  const productVariants = product.productVariants?.filter(row => active(colorOf(row.options)));
  const colorVariants = product.colorVariants?.filter(row => active(row.color));
  const availableColors = product.available_colors.filter(active);
  const defaultVariant = productVariants?.find(row => row.sku === product.defaultVariantSku) ?? productVariants?.[0];
  const defaultColor = availableColors.find(color => sellingColorKey(color) === sellingColorKey(product.defaultColor ?? "")) ?? availableColors[0] ?? "";
  const defaultColorVariant = colorVariants?.find(row => sellingColorKey(row.color) === sellingColorKey(defaultColor));
  const inactiveImages = [
    ...(product.colorVariants?.filter(row => !active(row.color)).map(row => row.imageSrc) ?? []),
    ...(product.productVariants?.filter(row => !active(colorOf(row.options))).map(row => row.imageSrc) ?? []),
  ].filter(Boolean);
  const mainImage = product.mainImage && inactiveImages.includes(product.mainImage)
    ? defaultVariant?.imageSrc || defaultColorVariant?.imageSrc || product.mainImage : product.mainImage;
  return {
    ...product,
    inactiveColors,
    colors: product.colors.filter(active),
    available_colors: availableColors,
    defaultColor,
    defaultVariantSku: defaultVariant?.sku ?? "",
    productVariants,
    colorVariants,
    colorSizeVariants: product.colorSizeVariants?.filter(row => active(row.color)),
    purchaseVariants: product.purchaseVariants?.filter(row => active(row.color ?? "")),
    variantOptions: product.variantOptions?.map(option => isColorName(option.name) ? { ...option, values: option.values.filter(active) } : option),
    attributes: product.attributes?.map(attribute => isColorName(attribute.slug || attribute.name) ? { ...attribute, options: attribute.options.filter(active) } : attribute),
    specs: product.specs.map(spec => isColorName(spec.label) ? { ...spec, value: availableColors.join(", ") } : spec),
    searchableTerms: product.searchableTerms?.filter(active),
    priceFrom: product.productKind === "variable" && productVariants?.length ? Math.min(...productVariants.map(row => row.regularPrice)) : product.priceFrom,
    mainImage,
  };
}
