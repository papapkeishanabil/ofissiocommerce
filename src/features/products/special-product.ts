export const SPECIAL_PRODUCT_DISPOSITION = "SKIPPED_SPECIAL_PRODUCT" as const;
export const SPECIAL_PRODUCT_REASON = "SERVICE_ADDON_NOT_CATALOG_PRODUCT" as const;

export function isSpecialServiceAddon(product: { sku?: string; name?: string }) {
  return product.sku?.trim().toUpperCase() === "BDR";
}
