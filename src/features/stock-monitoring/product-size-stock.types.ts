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
  return `${colorSku.trim()}-${size.trim()}`.toUpperCase().replace(/\s+/g, "-");
}
