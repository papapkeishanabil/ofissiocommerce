// src/types/product.ts
import type { FulfillmentType, Size } from "./industry";

export interface ProductSizeRow {
  size: Size;
  /** chest circumference in cm */
  chest: number;
  /** body length in cm */
  length: number;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  sku: string;
  /** a product may serve multiple industries */
  industries: string[];
  category: string;
  /** lowest unit price (IDR) before size/quantity adjustment */
  priceFrom: number;
  /** minimum order quantity across all sizes combined */
  moq: number;
  /** production or restock lead time in days */
  leadTimeDays: number;
  fulfillment: FulfillmentType;
  description: string;
  material: string;
  colors: string[];
  specs: ProductSpec[];
  sizeChart: ProductSizeRow[];
  /** stable accent color used by the image placeholder */
  accentColor: string;
}

export function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
