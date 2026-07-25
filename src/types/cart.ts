// src/types/cart.ts
import type { SizeMatrix } from "./industry";

export interface CartLineItem {
  /** stable id derived from productId + color (one line per product+color) */
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  sku: string;
  color: string;
  /** quantity per size */
  sizes: SizeMatrix;
  totalQty: number;
  /** unit price snapshot (IDR) — derived from product priceFrom */
  unitPrice: number;
  /** estimated price = unitPrice * totalQty */
  estimatedPrice: number;
  /** placeholder for future customization (logo/bordir) */
  customization: string | null;
}

export function emptySizeMatrix(): SizeMatrix {
  return { S: 0, M: 0, L: 0, XL: 0, "2XL": 0, "3XL": 0 };
}

export function sumSizeMatrix(m: SizeMatrix): number {
  return Object.values(m).reduce((acc, n) => acc + (n || 0), 0);
}

export function lineItemId(productId: string, color: string): string {
  return `${productId}__${color.toLowerCase()}`;
}
