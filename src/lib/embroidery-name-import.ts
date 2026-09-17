import Papa from "papaparse";

import type { LogoPlacement } from "@/types/uniform-3d";

export const EMBROIDERY_NAME_SIZES = ["S", "M", "L", "XL", "2XL", "3XL"] as const;

export type EmbroideryNameAllocation = NonNullable<
  LogoPlacement["textBordir"]
>["allocations"][number];

export interface EmbroideryNameImportIssue {
  row?: number;
  message: string;
}

export interface EmbroideryNameImportResult {
  allocations: EmbroideryNameAllocation[];
  errors: EmbroideryNameImportIssue[];
  warnings: string[];
}

export interface EmbroideryNameOrderComparison {
  allocatedTotal: number;
  orderedTotal: number;
  mismatches: Array<{ size: string; allocated: number; ordered: number }>;
  status: "no-order" | "match" | "mismatch";
}

const NAME_HEADERS = new Set(["nama", "namabordir", "name", "embroideryname"]);
const SIZE_HEADERS = new Set(["ukuran", "size"]);
const QUANTITY_HEADERS = new Set(["jumlah", "qty", "quantity", "kuantitas"]);

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeSize(value: unknown): EmbroideryNameAllocation["size"] | null {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s_-]/g, "");

  const aliases: Record<string, EmbroideryNameAllocation["size"]> = {
    S: "S",
    M: "M",
    L: "L",
    XL: "XL",
    XXL: "2XL",
    "2XL": "2XL",
    XXXL: "3XL",
    "3XL": "3XL",
  };

  return aliases[normalized] ?? null;
}

function cell(row: readonly unknown[], index: number) {
  return index >= 0 ? String(row[index] ?? "").trim() : "";
}

export function parseEmbroideryNameList(input: string): EmbroideryNameImportResult {
  const parsed = Papa.parse<string[]>(input.replace(/^\uFEFF/, ""), {
    skipEmptyLines: "greedy",
  });
  const errors: EmbroideryNameImportIssue[] = parsed.errors.map((error) => ({
    row: typeof error.row === "number" ? error.row + 1 : undefined,
    message: `Format daftar tidak dapat dibaca: ${error.message}`,
  }));
  const warnings: string[] = [];
  const rawRows = parsed.data.map((row) => row.map((value) => String(value ?? "").trim()));

  if (!rawRows.length) {
    return {
      allocations: [],
      errors: [{ message: "Daftar masih kosong." }],
      warnings,
    };
  }

  const firstRow = rawRows[0] ?? [];
  const normalizedFirstRow = firstRow.map(normalizeHeader);
  const hasHeader = normalizedFirstRow.some(
    (value) => NAME_HEADERS.has(value) || SIZE_HEADERS.has(value) || QUANTITY_HEADERS.has(value),
  );
  const nameIndex = hasHeader
    ? normalizedFirstRow.findIndex((value) => NAME_HEADERS.has(value))
    : 0;
  const sizeIndex = hasHeader
    ? normalizedFirstRow.findIndex((value) => SIZE_HEADERS.has(value))
    : 1;
  const quantityIndex = hasHeader
    ? normalizedFirstRow.findIndex((value) => QUANTITY_HEADERS.has(value))
    : 2;
  const rows = hasHeader ? rawRows.slice(1) : rawRows;
  const firstDataRowNumber = hasHeader ? 2 : 1;

  if (hasHeader && nameIndex < 0) errors.push({ row: 1, message: "Kolom Nama Bordir belum ditemukan." });
  if (hasHeader && sizeIndex < 0) errors.push({ row: 1, message: "Kolom Ukuran belum ditemukan." });
  if (rows.length > 500) {
    errors.push({ message: "Maksimal 500 baris nama dalam satu daftar." });
  }

  const allocations: EmbroideryNameAllocation[] = [];
  for (const [index, row] of rows.slice(0, 500).entries()) {
    const rowNumber = firstDataRowNumber + index;
    const name = cell(row, nameIndex).replace(/\s+/g, " ");
    const sizeValue = cell(row, sizeIndex);
    const size = normalizeSize(sizeValue);
    const quantityValue = cell(row, quantityIndex);
    const quantity = quantityValue === "" ? 1 : Number(quantityValue);
    let valid = true;

    if (!name) {
      errors.push({ row: rowNumber, message: "Nama bordir belum diisi." });
      valid = false;
    } else if (name.length > 40) {
      errors.push({ row: rowNumber, message: "Nama bordir melebihi 40 karakter." });
      valid = false;
    }
    if (!size) {
      errors.push({
        row: rowNumber,
        message: `Ukuran “${sizeValue || "kosong"}” tidak dikenali. Gunakan S, M, L, XL, 2XL, atau 3XL.`,
      });
      valid = false;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100_000) {
      errors.push({ row: rowNumber, message: "Jumlah harus berupa angka bulat minimal 1." });
      valid = false;
    }

    if (valid && size) allocations.push({ name, size, quantity });
  }

  const repeatedNames = new Map<string, number>();
  for (const row of allocations) {
    const key = row.name.toLocaleUpperCase("id-ID");
    repeatedNames.set(key, (repeatedNames.get(key) ?? 0) + row.quantity);
  }
  const duplicateCount = [...repeatedNames.values()].filter((quantity) => quantity > 1).length;
  if (duplicateCount > 0) {
    warnings.push(
      `${duplicateCount} nama digunakan lebih dari sekali. Pastikan pengulangan tersebut memang disengaja.`,
    );
  }

  return { allocations, errors, warnings };
}

export function compareEmbroideryNamesToOrder(
  allocations: readonly EmbroideryNameAllocation[],
  sizes: Record<string, number>,
): EmbroideryNameOrderComparison {
  const allocatedBySize: Record<string, number> = {};
  for (const row of allocations) {
    allocatedBySize[row.size] = (allocatedBySize[row.size] ?? 0) + row.quantity;
  }

  const orderedTotal = Object.values(sizes).reduce(
    (total, quantity) => total + Math.max(0, Math.trunc(Number(quantity) || 0)),
    0,
  );
  const allocatedTotal = allocations.reduce((total, row) => total + row.quantity, 0);
  const relevantSizes = EMBROIDERY_NAME_SIZES.filter(
    (size) => (sizes[size] ?? 0) > 0 || (allocatedBySize[size] ?? 0) > 0,
  );
  const mismatches = relevantSizes
    .map((size) => ({
      size,
      allocated: allocatedBySize[size] ?? 0,
      ordered: Math.max(0, Math.trunc(Number(sizes[size]) || 0)),
    }))
    .filter((row) => row.allocated !== row.ordered);

  return {
    allocatedTotal,
    orderedTotal,
    mismatches,
    status: orderedTotal === 0 ? "no-order" : mismatches.length === 0 ? "match" : "mismatch",
  };
}
