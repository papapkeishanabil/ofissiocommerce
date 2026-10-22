import { combinationKey, isSizeOption, optionKey, variantOptionSchema, type ProductVariantInput, type VariantOption } from "./product-variants";

export interface VariantSizeGroup {
  key: string;
  label: string;
  rows: ProductVariantInput[];
  skuPrefix: string;
}

export function variantStockSku(prefix: string, size: string) {
  const base = prefix.trim();
  if (!/^[A-Za-z0-9._-]+$/.test(base)) throw new Error("Isi SKU varian tanpa spasi, misalnya KK-006LPD.");
  if (typeof size !== "string" || !size.trim()) throw new Error("Lengkapi pilihan Ukuran, lalu perbarui kombinasi varian.");
  const sku = `${base}-${size.trim()}`;
  if (sku.length > 100) throw new Error("SKU stok beserta ukuran maksimal 100 karakter.");
  return sku;
}

function commonPrefix(rows: ProductVariantInput[], sizeName: string) {
  const prefixes = rows.filter(row => row.sku).map(row => {
    const suffix = `-${row.options[sizeName] ?? ""}`;
    return row.sku.toLowerCase().endsWith(suffix.toLowerCase()) ? row.sku.slice(0, -suffix.length) : "";
  });
  const first = prefixes[0];
  return first && prefixes.every(prefix => prefix === first) ? first : "";
}

export function variantSizeGroups(options: VariantOption[], variants: ProductVariantInput[]): VariantSizeGroup[] {
  const size = options.find(o => isSizeOption(o.name));
  if (!size) return [];
  const axes = options.filter(o => !isSizeOption(o.name));
  const groups = new Map<string, ProductVariantInput[]>();
  for (const row of variants) {
    const key = combinationKey(axes, row.options);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups].map(([key, rows]) => ({ key, rows, label: axes.map(o => rows[0]?.options[o.name]).filter(Boolean).join(" / ") || "Semua ukuran", skuPrefix: commonPrefix(rows, size.name) }));
}

/** Keeps existing identities/SKUs; only new combinations inherit a proven prefix. */
export function generateVariantCombinations(options: VariantOption[], existing: ProductVariantInput[], regularPrice: number) {
  if (!options.length || options.length > 8) throw new Error("Tambahkan satu hingga delapan pilihan varian.");
  const clean = options.map(option => {
    const result = variantOptionSchema.safeParse(option);
    if (!result.success) throw new Error("Isi nama dan setidaknya satu nilai untuk setiap pilihan varian.");
    return result.data;
  });
  if (new Set(clean.map(o => optionKey(o.name))).size !== clean.length || clean.some(o => new Set(o.values.map(optionKey)).size !== o.values.length)) throw new Error("Nama dan nilai pilihan tidak boleh berulang.");
  if (clean.reduce((count, o) => count * o.values.length, 1) > 1000) throw new Error("Maksimal 1.000 kombinasi. Kurangi pilihan terlebih dahulu.");
  const size = clean.find(o => isSizeOption(o.name));
  const axes = clean.filter(o => !isSizeOption(o.name));
  let values: Record<string, string>[] = [{}];
  for (const option of clean) values = values.flatMap(row => option.values.map(value => ({ ...row, [option.name]: value })));
  return values.map(selection => {
    const exact = existing.find(row => Object.keys(row.options).length === clean.length && combinationKey(clean, row.options) === combinationKey(clean, selection));
    if (exact) return exact;
    const siblings = size ? existing.filter(row => combinationKey(axes, row.options) === combinationKey(axes, selection)) : [];
    const template = siblings[0];
    const unsized = siblings.find(row => !row.options[size!.name]);
    const prefix = size ? unsized?.sku || commonPrefix(siblings, size.name) : "";
    const imageSrc = template && siblings.every(row => row.imageSrc === template.imageSrc) ? template.imageSrc : "";
    const price = template && siblings.every(row => row.regularPrice === template.regularPrice) ? template.regularPrice : regularPrice;
    return { options: selection, sku: size && prefix ? variantStockSku(prefix, selection[size.name]!) : "", imageSrc, regularPrice: price };
  });
}

export function applyVariantSizeGroup(options: VariantOption[], variants: ProductVariantInput[], groupKey: string, input: { skuPrefix: string; imageSrc?: string; regularPrice?: number; replaceSkus?: boolean }) {
  const size = options.find(o => isSizeOption(o.name));
  if (!size) throw new Error("Tambahkan pilihan Ukuran terlebih dahulu.");
  const axes = options.filter(o => !isSizeOption(o.name));
  const hasUnsizedRows = variants.some(row => !row.options[size.name]);
  const complete = hasUnsizedRows ? generateVariantCombinations(options, variants, 0) : variants;
  if (hasUnsizedRows && variants.some(row => row.id && !complete.some(nextRow => nextRow.id === row.id))) {
    throw new Error("Klik Buat / perbarui kombinasi terlebih dahulu untuk mengubah varian tersimpan menjadi varian per ukuran. Stok lama tidak dibagi otomatis.");
  }
  const next = complete.map(row => {
    if (combinationKey(axes, row.options) !== groupKey) return row;
    const sku = row.sku && !input.replaceSkus ? row.sku : variantStockSku(input.skuPrefix, row.options[size.name]!);
    return { ...row, sku, ...(input.imageSrc === undefined ? {} : { imageSrc: input.imageSrc }), ...(input.regularPrice === undefined ? {} : { regularPrice: input.regularPrice }) };
  });
  const skus = next.filter(row => row.sku).map(row => optionKey(row.sku));
  if (new Set(skus).size !== skus.length) throw new Error("SKU hasil pengisian otomatis bertabrakan dengan varian lain. Periksa SKU varian.");
  return next;
}
