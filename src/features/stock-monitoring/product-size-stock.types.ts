export interface ProductSizeStockRow {
  size: string;
  sku: string;
  availableQty: number | null;
}

export interface ProductSizeStock {
  color: string;
  source: "ginee" | "woocommerce";
  checkedAt: string;
  rows: ProductSizeStockRow[];
}

export function sizeStockSku(colorSku: string, size: string) {
  const label = size.trim().toUpperCase();
  return `${colorSku.trim()}-${label === "2XL" ? "XXL" : label === "XXXL" ? "3XL" : label}`.toUpperCase().replace(/\s+/g, "-");
}
