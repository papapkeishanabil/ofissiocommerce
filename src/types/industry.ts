// src/types/industry.ts
// Master enumerations used across catalog, Ofistant quick choices, and filters.

export const INDUSTRIES = [
  "Pertambangan",
  "Konstruksi",
  "Manufaktur",
  "Perhotelan",
  "Kesehatan",
  "F&B",
  "Security",
  "Corporate",
  // UKM-naik-kelas expansion: first-class small-business industries so the
  // catalog, Ofistant, and homepage treat UKM and korporasi as peer audiences.
  "Bengkel",
  "Retail",
  "Grosir",
  "Laundry",
  "Salon",
  "Bangunan",
  "Sparepart",
  "Petshop",
  "Ekspedisi",
  "BUMN",
  "Maritim",
  "Pendidikan",
] as const;

export type Industry = (typeof INDUSTRIES)[number];

export const CATEGORIES = [
  "Kemeja Lapangan",
  "Wearpack",
  "Rompi Safety",
  "Jaket Kerja",
  "Polo Shirt",
  "Kemeja Kantor",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const SIZES = ["S", "M", "L", "XL", "2XL", "3XL"] as const;
export type Size = (typeof SIZES)[number];

export type SizeMatrix = Record<Size, number>;

export const FULFILLMENT_TYPES = ["READY_STOCK", "MADE_TO_ORDER"] as const;
export type FulfillmentType = (typeof FULFILLMENT_TYPES)[number];

export function fulfillmentLabel(t: FulfillmentType): string {
  return t === "READY_STOCK" ? "Ready Stock" : "Made to Order";
}
