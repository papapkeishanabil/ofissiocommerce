// src/features/size-charts/size-chart.types.ts
// Master standar ukuran Ofissio: tabel pengukuran per jenis produk yang
// otomatis terpasang ke produk berdasarkan kategori WooCommerce-nya.
// Pure data — diimport dari client & server (tanpa "server-only").

import { SIZES, type Size } from "@/types/industry";

export interface SizeChartRow {
  size: Size;
  /** lingkar dada (cm) */
  chest: number;
  /** panjang badan (cm) */
  length: number;
  /** lebar bahu (cm); 0 = tidak diukur untuk standar ini */
  shoulder: number;
  /** rekomendasi tinggi badan pemakai (cm); 0 = tidak diukur */
  height: number;
  sleeveLength?: number;
  upperArm?: number;
  elbow?: number;
  lowerArm?: number;
  weightMin?: number;
  weightMax?: number;
}

export interface SizeChartStandard {
  /** id stabil (slug) — dipakai sebagai key dan saat membandingkan revisi. */
  id: string;
  /** Nampil di customer, cth: "Kemeja Lengan Pendek". */
  name: string;
  description?: string;
  /** Kategori WooCommerce (slug) yang otomatis memakai standar ini. */
  categorySlugs: string[];
  /** Exact product slugs take precedence; do not use shared categories for model-specific charts. */
  productSlugs?: string[];
  verified?: boolean;
  /** Terpakai saat tidak ada standar lain yang cocok dengan kategori produk. */
  isFallback?: boolean;
  rows: SizeChartRow[];
}

/**
 * Nilai awal yang wajar untuk workwear — ANGKA MASIH PERLU DIVALIDASI tim
 * produksi lewat Admin → Pengaturan → Standar Ukuran sebelum dipercaya.
 */
export const DEFAULT_SIZE_CHART_STANDARDS: SizeChartStandard[] = [
  {
    id: "kemeja-lengan-pendek",
    name: "Kemeja Lengan Pendek",
    description: "Kemeja kerja lengan pendek reguler.",
    categorySlugs: ["kemeja", "kemeja-lapangan"],
    rows: [
      { size: "S", chest: 96, length: 66, shoulder: 42, height: 160 },
      { size: "M", chest: 100, length: 68, shoulder: 44, height: 165 },
      { size: "L", chest: 104, length: 70, shoulder: 46, height: 170 },
      { size: "XL", chest: 108, length: 72, shoulder: 48, height: 175 },
      { size: "2XL", chest: 112, length: 74, shoulder: 50, height: 180 },
      { size: "3XL", chest: 116, length: 76, shoulder: 52, height: 185 },
    ],
  },
  {
    id: "kemeja-lengan-panjang",
    name: "Kemeja Lengan Panjang",
    description: "Kemeja kerja lengan panjang reguler.",
    categorySlugs: ["kemeja-lengan-panjang"],
    rows: [
      { size: "S", chest: 96, length: 70, shoulder: 42, height: 160 },
      { size: "M", chest: 100, length: 72, shoulder: 44, height: 165 },
      { size: "L", chest: 104, length: 74, shoulder: 46, height: 170 },
      { size: "XL", chest: 108, length: 76, shoulder: 48, height: 175 },
      { size: "2XL", chest: 112, length: 78, shoulder: 50, height: 180 },
      { size: "3XL", chest: 116, length: 80, shoulder: 52, height: 185 },
    ],
  },
  {
    id: "polo",
    name: "Polo Kerja",
    description: "Kaos polo kerja pique.",
    categorySlugs: ["polo"],
    rows: [
      { size: "S", chest: 94, length: 64, shoulder: 41, height: 160 },
      { size: "M", chest: 98, length: 66, shoulder: 43, height: 165 },
      { size: "L", chest: 102, length: 68, shoulder: 45, height: 170 },
      { size: "XL", chest: 106, length: 70, shoulder: 47, height: 175 },
      { size: "2XL", chest: 110, length: 72, shoulder: 49, height: 180 },
      { size: "3XL", chest: 114, length: 74, shoulder: 51, height: 185 },
    ],
  },
  {
    id: "jaket",
    name: "Jaket Kerja",
    description: "Jaket kerja outerwear.",
    categorySlugs: ["jaket"],
    rows: [
      { size: "S", chest: 104, length: 62, shoulder: 44, height: 160 },
      { size: "M", chest: 108, length: 64, shoulder: 46, height: 165 },
      { size: "L", chest: 112, length: 66, shoulder: 48, height: 170 },
      { size: "XL", chest: 116, length: 68, shoulder: 50, height: 175 },
      { size: "2XL", chest: 120, length: 70, shoulder: 52, height: 180 },
      { size: "3XL", chest: 124, length: 72, shoulder: 54, height: 185 },
    ],
  },
];

const ID_MAX = 60;

function coerceCm(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(Math.round(parsed), 300);
}

function normalizeSlug(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeRows(raw: unknown): SizeChartRow[] {
  if (!Array.isArray(raw)) return [];
  return SIZES.map((size) => {
    // Slug mengecilkan huruf; bandingkan case-insensitive terhadap SIZES.
    const match = raw.find(
      (row) =>
        row &&
        typeof row === "object" &&
        normalizeSlug((row as Record<string, unknown>).size).toUpperCase() === size,
    ) as Record<string, unknown> | undefined;
    return {
      size,
      chest: coerceCm(match?.chest),
      length: coerceCm(match?.length),
      shoulder: coerceCm(match?.shoulder),
      height: coerceCm(match?.height),
      sleeveLength: coerceCm(match?.sleeveLength),
      upperArm: coerceCm(match?.upperArm),
      elbow: coerceCm(match?.elbow),
      lowerArm: coerceCm(match?.lowerArm),
      weightMin: coerceCm(match?.weightMin),
      weightMax: coerceCm(match?.weightMax),
    };
  }).filter((row) => row.chest > 0 || row.length > 0 || row.shoulder > 0 || row.height > 0);
}

function normalizeStandard(raw: Record<string, unknown>, index: number): SizeChartStandard {
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 80) : `Standar ${index + 1}`;
  const slug = normalizeSlug(raw.id) || normalizeSlug(name).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const rows = normalizeRows(raw.rows);
  return {
    id: (slug || `standar-${index + 1}`).slice(0, ID_MAX),
    name,
    description: typeof raw.description === "string" && raw.description.trim() ? raw.description.trim().slice(0, 160) : undefined,
    categorySlugs: Array.isArray(raw.categorySlugs)
      ? [...new Set(raw.categorySlugs.map(normalizeSlug).filter(Boolean))].slice(0, 20)
      : [],
    isFallback: raw.isFallback === true,
    productSlugs: Array.isArray(raw.productSlugs)
      ? [...new Set(raw.productSlugs.map(normalizeSlug).filter(Boolean))].slice(0, 100)
      : [],
    verified: raw.verified === true,
    rows: rows.length ? rows : normalizeRows(DEFAULT_SIZE_CHART_STANDARDS[index % DEFAULT_SIZE_CHART_STANDARDS.length]?.rows),
  };
}

/** Normalisasi payload apa pun (DB row / API / partial) jadi standar yang valid. */
export function normalizeSizeChartStandards(raw: unknown): SizeChartStandard[] {
  if (!Array.isArray(raw)) return DEFAULT_SIZE_CHART_STANDARDS.map((standard) => ({ ...standard, rows: [...standard.rows] }));
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .slice(0, 50)
    .map(normalizeStandard);
}
