import type { OfissioProduct } from "./product.types";
import { isColorOption, isSizeOption, isSleeveOption } from "./product-variants";
import { matchingPurchaseVariant } from "./purchase-variants";
import { stockSize } from "./color-size-variants";

/** Resolve only real, selectable rows; never infer a variant from a SKU suffix. */
export function linkedVariantSelection(product: OfissioProduct, sku?: string) {
  if (!sku) return undefined;
  const generic = linkedProductVariant(product, sku);
  if (generic) {
    const value = (test: (name: string) => boolean) => {
      const option = product.variantOptions?.find(row => test(row.name));
      return option ? generic.options[option.name] : undefined;
    };
    return { size: value(isSizeOption), color: value(isColorOption) || product.defaultColor || product.colors[0], sleeve: value(isSleeveOption) };
  }
  if (product.productKind === "variable") return undefined;
  const row = product.colorSizeVariantsEnabled
    ? product.colorSizeVariants?.find(row => row.sku === sku)
    : product.purchaseVariants?.find(row => row.sku === sku);
  if (!row || !product.available_sizes.some(size => stockSize(size) === stockSize(row.size))) return undefined;
  const color = row.color || product.defaultColor || product.colors[0];
  if (!color || !product.colors.some(value => value.toLowerCase() === color.toLowerCase())) return undefined;
  const sleeve = "sleeve" in row ? row.sleeve : undefined;
  if (!product.colorSizeVariantsEnabled && matchingPurchaseVariant(product, row.size, sleeve, color)?.id !== row.id) return undefined;
  return { size: row.size, color, sleeve };
}

export function linkedProductVariant(product: OfissioProduct, sku?: string) {
  return product.productKind === "variable" && sku
    ? product.productVariants?.find(row => row.sku === sku) : undefined;
}

export function linkedVariantSizes(product: OfissioProduct, sku?: string): Record<string, number> {
  const size = linkedVariantSelection(product, sku)?.size;
  return size ? { [size === "XXL" ? "2XL" : size === "XXXL" ? "3XL" : size]: 1 } : {};
}

export const variantLink = (url: string, sku: string) => `${url}?variant=${encodeURIComponent(sku)}`;
