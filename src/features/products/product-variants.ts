import { z } from "zod";
import type { OfissioProduct } from "./product.types";
import type { WooCommerceProductVariation } from "./woocommerce/woocommerce.types";
import { stockSize } from "./color-size-variants";
import { getMetaBoolean, getMetaString } from "./woocommerce/woocommerce-product-meta";
import { FABRIC_COLOR_META, readFabricColor } from "./color-variants";

export const PRODUCT_KIND_META = "ofissio_product_kind";
export const MODEL_CODE_META = "ofissio_model_code";
export const VARIANT_OPTIONS_META = "ofissio_variant_options";
export const GENERIC_VARIANTS_META = "ofissio_product_variants";
export const GENERIC_VARIANT_MARKER = "ofissio_product_variant";
export const optionKey = (value: string) => value.trim().toLocaleLowerCase("id-ID");
export const isColorOption = (name: string) => /^(pa_)?(warna|color)$/i.test(name);
export const isSizeOption = (name: string) => /^(pa_)?(ukuran|size)$/i.test(name);
export const isSleeveOption = (name: string) => /^(pa_)?(lengan|panjang[-_ ]lengan|tipe[-_ ]lengan|sleeve)$/i.test(name);

export const variantOptionSchema = z.object({
  name: z.string().trim().min(1, "Isi nama pilihan varian, misalnya Warna atau Ukuran.").max(60),
  values: z.array(z.string().trim().min(1, "Isi nilai pilihan varian atau hapus nilai yang kosong.").max(100)).min(1, "Isi minimal satu nilai untuk setiap pilihan varian.").max(60),
});
export const productVariantSchema = z.object({
  id: z.number().int().positive().optional(),
  options: z.record(z.string().trim().min(1).max(60), z.string().trim().min(1).max(100)),
  sku: z.string().trim().min(1, "Isi SKU stok untuk setiap kombinasi varian. Gunakan Terapkan ke semua ukuran untuk mengisi SKU per ukuran.").max(100).regex(/^[A-Za-z0-9._-]+$/, "Format SKU tidak valid."),
  imageSrc: z.string().max(2000).default(""),
  fabricColor: z.string().trim().regex(/^(?:#[0-9a-f]{6})?$/i, "Gunakan HEX enam digit, misalnya #B69A84.").transform(value => value.toLowerCase()).optional(),
  regularPrice: z.number().positive().max(10_000_000_000),
});
export type VariantOption = z.infer<typeof variantOptionSchema>;
export type ProductVariantInput = z.infer<typeof productVariantSchema>;
export type ProductVariant = ProductVariantInput & { id: number };
export function readVariantOptions(value: unknown): VariantOption[] {
  if (typeof value === "string") { try { value = JSON.parse(value); } catch { return []; } }
  const parsed = z.array(variantOptionSchema).max(8).safeParse(value);
  return parsed.success ? parsed.data : [];
}
export function readProductVariants(value: unknown): ProductVariant[] {
  if (typeof value === "string") { try { value = JSON.parse(value); } catch { return []; } }
  const parsed = z.array(productVariantSchema.extend({ id: z.number().int().positive() })).safeParse(value);
  return parsed.success ? parsed.data : [];
}
export const selectedOptionsSchema = z.record(z.string().trim().min(1).max(60), z.string().trim().min(1).max(100)).refine(value => Object.keys(value).length <= 8, "Terlalu banyak pilihan varian.");

export const productVariantsSchema = z.object({
  options: z.array(variantOptionSchema).min(1, "Tambahkan minimal satu pilihan di Varian Produk, misalnya Warna atau Ukuran.").max(8),
  variants: z.array(productVariantSchema).min(1, "Kombinasi varian belum dibuat. Di bagian Varian Produk, lengkapi pilihan lalu klik Buat / perbarui kombinasi.").max(1000),
  defaultVariantSku: z.string().trim().min(1, "Pilih varian yang tampil pertama setelah mengisi SKU stok.").max(100),
}).superRefine((input, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: "custom", message });
  if (new Set(input.options.map(o => optionKey(o.name))).size !== input.options.length) issue("Nama pilihan varian tidak boleh berulang.");
  for (const option of input.options) {
    if (new Set(option.values.map(optionKey)).size !== option.values.length) issue(`Nilai ${option.name} tidak boleh berulang.`);
    if (isSizeOption(option.name) && option.values.some(value => !["OS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "XXXL", "3XL", "4XL", "5XL"].includes(value.toUpperCase()))) issue("Gunakan ukuran OS, XS, S, M, L, XL, XXL/2XL, 3XL, 4XL, atau 5XL.");
  }
  if (input.options.filter(o => isColorOption(o.name)).length > 1 || input.options.filter(o => isSizeOption(o.name)).length > 1) issue("Gunakan satu pilihan Warna dan satu pilihan Ukuran.");
  const keys = new Set<string>(), skus = new Set<string>(), ids = new Set<number>();
  for (const row of input.variants) {
    if (Object.keys(row.options).length !== input.options.length || input.options.some(o => !o.values.includes(row.options[o.name] ?? ""))) issue(`Lengkapi seluruh pilihan untuk SKU ${row.sku}.`);
    const key = combinationKey(input.options, row.options);
    if (keys.has(key)) issue("Kombinasi varian tidak boleh berulang.");
    if (skus.has(optionKey(row.sku))) issue(`SKU ${row.sku} digunakan lebih dari sekali.`);
    if (row.id && ids.has(row.id)) issue("ID varian tidak boleh berulang.");
    keys.add(key); skus.add(optionKey(row.sku)); if (row.id) ids.add(row.id);
  }
  if (!input.variants.some(v => v.sku === input.defaultVariantSku)) issue("Pilih varian yang tampil pertama.");
});

export function combinationKey(options: VariantOption[], values: Record<string, string>) {
  return JSON.stringify(options.map(o => [optionKey(o.name), optionKey(values[o.name] ?? "")]));
}

export function mapProductVariants(rows: WooCommerceProductVariation[], options: VariantOption[]): ProductVariant[] {
  if (!options.length) return [];
  return rows.filter(row => row.status === "publish").flatMap(row => {
    const values: Record<string, string> = {};
    for (const option of options) {
      const attr = row.attributes?.find(a => optionKey(a.name ?? "") === optionKey(option.name));
      if (!attr?.option || !option.values.includes(attr.option)) return [];
      values[option.name] = attr.option;
    }
    return [{ id: row.id, sku: row.sku, options: values, fabricColor: readFabricColor(getMetaString(row.meta_data ?? [], FABRIC_COLOR_META)), imageSrc: getMetaBoolean(row.meta_data ?? [], "ofissio_variant_inherit_image", false) ? "" : row.image?.src ?? "", regularPrice: Number(row.regular_price || row.price) }];
  });
}

/** Admin migration only: infer missing imported attributes only when unambiguous. */
export function mapLegacyProductVariants(rows: WooCommerceProductVariation[], options: VariantOption[]): ProductVariant[] {
  if (!options.length) return [];
  const active = rows.filter(row => row.status === "publish");
  const mapped = active.flatMap(row => {
    const attributes = options.map(option => {
      const existing = row.attributes?.find(attr => optionKey(attr.name ?? "") === optionKey(option.name));
      if (existing?.option) return { name: option.name, option: existing.option };
      const candidates = isSizeOption(option.name)
        ? option.values.filter(value => {
          const suffix = row.sku.match(/-([^-]+)$/)?.[1];
          return suffix && stockSize(suffix) === stockSize(value);
        })
        : option.values.length === 1 ? option.values : [];
      return { name: option.name, option: candidates.length === 1 ? candidates[0]! : "" };
    });
    return mapProductVariants([{ ...row, attributes }], options);
  });
  if (mapped.length !== active.length || new Set(mapped.map(row => combinationKey(options, row.options))).size !== mapped.length) return [];
  return mapped;
}

export function matchingProductVariant(product: OfissioProduct, selection: Record<string, string>, size?: string) {
  const options = product.variantOptions ?? [];
  if (!options.length) return undefined;
  const matches = (product.productVariants ?? []).filter(row => options.every(option => {
    const value = isSizeOption(option.name) ? size : selection[option.name];
    return value != null && (isSizeOption(option.name) ? stockSize(row.options[option.name] ?? "") === stockSize(value) : row.options[option.name] === value);
  }));
  return matches.length === 1 ? matches[0] : undefined;
}

export function selectProductVariants(product: OfissioProduct, sizes: Record<string, number>, selection: Record<string, string> = {}) {
  if (product.productKind !== "variable") return undefined;
  if (!product.stockVariantsReady) throw new Error("Varian produk belum selesai disimpan. Hubungi admin produk.");
  const options = product.variantOptions ?? [];
  if (!options.length) throw new Error("Pilihan varian belum tersedia. Hubungi admin produk.");
  if (!options.some(o => isSizeOption(o.name)) && Object.entries(sizes).some(([size, qty]) => qty > 0 && size !== "OS")) throw new Error("Produk ini tidak memiliki pilihan ukuran.");
  if (Object.keys(selection).some(name => !options.some(o => o.name === name && !isSizeOption(name)))) throw new Error("Pilihan varian tidak valid.");
  return Object.entries(sizes).filter(([, qty]) => qty > 0).map(([size, quantity]) => {
    const row = matchingProductVariant(product, selection, size);
    if (!row) throw new Error(`Kombinasi varian ${size === "OS" ? "ini" : size} tidak tersedia. Pilih kombinasi lain.`);
    return { variationId: row.id, sku: row.sku, size, quantity };
  });
}

/** Variant prices may differ between choices, but sizes in one cart line share a price. */
export function selectedVariantPrice(product: OfissioProduct, selection: Record<string, string>, sizes: Record<string, number>) {
  if (product.productKind !== "variable") return product.priceFrom;
  const rows = Object.entries(sizes).filter(([, qty]) => qty > 0).map(([size]) => matchingProductVariant(product, selection, size));
  const prices = [...new Set(rows.map(row => row?.regularPrice))];
  if (rows.some(row => !row) || prices.length !== 1 || !(prices[0]! > 0)) throw new Error("Pilih ukuran dengan harga yang sama dalam satu item. Tambahkan ukuran dengan harga berbeda sebagai item terpisah.");
  return prices[0]!;
}
