import type { OfissioProduct } from "./product.types";
import { isSizeOption } from "./product-variants";

export function linkedProductVariant(product: OfissioProduct, sku?: string) {
  return product.productKind === "variable" && sku
    ? product.productVariants?.find(row => row.sku === sku) : undefined;
}

export function linkedVariantSizes(product: OfissioProduct, sku?: string): Record<string, number> {
  const row = linkedProductVariant(product, sku);
  const option = product.variantOptions?.find(o => isSizeOption(o.name));
  const size = row && option ? row.options[option.name] : undefined;
  return size ? { [size === "XXL" ? "2XL" : size === "XXXL" ? "3XL" : size]: 1 } : {};
}

export const variantLink = (url: string, sku: string) => `${url}?variant=${encodeURIComponent(sku)}`;
