// src/features/size-charts/resolve-size-chart.ts
// Pencocokan standar ukuran → produk. Pure — dipakai server (halaman produk)
// dan bisa diuji langsung. Urutan standar menentukan prioritas: kecocokan
// kategori pertama menang; tanpa kecocokan, standar fallback pertama dipakai.

import type { Size } from "@/types/industry";
import type { SizeChartRow, SizeChartStandard } from "./size-chart.types";

export interface SizeChartProductInput {
  slug?: string;
  /** Slug kategori WooCommerce produk (cth: ["kemeja", "kemeja-lapangan"]). */
  categorySlugs: readonly string[];
  /** Ukuran yang tersedia untuk produk ini; kosong = tampilkan semua. */
  availableSizes?: readonly string[];
}

/**
 * Pilih standar untuk produk lalu bangun baris size chart-nya.
 * `null` bila tidak ada standar yang cocok atau datanya belum berarti
 * (semua nol) — pemanggil wajib menyembunyikan panduan ukuran saat null.
 */
export function resolveSizeChart(
  standards: readonly SizeChartStandard[],
  product: SizeChartProductInput,
): { rows: SizeChartRow[]; standard: SizeChartStandard } | null {
  const productSlugs = new Set(product.categorySlugs.map((slug) => slug.trim().toLowerCase()).filter(Boolean));
  const matched =
    standards.find((standard) => product.slug && standard.productSlugs?.includes(product.slug.trim().toLowerCase())) ??
    standards.find((standard) => !standard.productSlugs?.length && standard.categorySlugs.some((slug) => productSlugs.has(slug))) ??
    standards.find((standard) => !standard.productSlugs?.length && standard.isFallback);
  if (!matched) return null;

  const meaningful = matched.rows.filter(
    (row) => row.chest > 0 || row.length > 0 || row.shoulder > 0 || row.height > 0,
  );
  if (!meaningful.length) return null;

  const available = new Set(product.availableSizes ?? []);
  const rows = available.size ? meaningful.filter((row) => available.has(row.size)) : meaningful;
  if (!rows.length) return null;

  return { rows, standard: matched };
}
