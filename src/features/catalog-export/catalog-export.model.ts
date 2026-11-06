import sanitizeHtml from "sanitize-html";
import { masterColor, colorNameKey } from "@/lib/product-color-master";
import { isColorOption, isSizeOption, isSleeveOption, mapProductVariants, readVariantOptions, PRODUCT_KIND_META, VARIANT_OPTIONS_META } from "@/features/products/product-variants";
import { getMetaString, getMetaStringArray, getMetaValue } from "@/features/products/woocommerce/woocommerce-product-meta";
import type { WooCommerceProduct, WooCommerceProductVariation } from "@/features/products/woocommerce/woocommerce.types";
import type { CatalogExportOptions, CatalogProduct, CatalogVariant } from "./catalog-export.schema";

const sizeOrder = ["OS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
const sizeKey = (s: string) => s.toUpperCase().replace(/^XXL$/, "2XL").replace(/^XXXL$/, "3XL");
export const normalizeSleeve = (s: string) => /^(short|pendek|lengan pendek)$/i.test(s.trim()) ? "Pendek" : /^(long|panjang|lengan panjang)$/i.test(s.trim()) ? "Panjang" : s.trim();
const text = (s: unknown) => sanitizeHtml(String(s ?? ""), { allowedTags: [], allowedAttributes: {} }).trim();
function readProductColorValues(value: unknown): Record<string,string> {
  if (typeof value === "string") { try { value = JSON.parse(value); } catch { return {}; } }
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([name,color]) => name.length <= 100 && typeof color === "string" && /^#[\da-f]{6}$/i.test(color)));
}

export function selectCatalogProducts<T extends { id: number; status: string; categories?: { id: number }[] }>(products: T[], options: CatalogExportOptions) {
  const published = products.filter(p => p.status === "publish");
  const ids = new Set(options.productIds);
  const categories = new Set(options.categoryIds);
  const selected = published.filter(p => options.scope === "all" || (options.scope === "selected" ? ids.has(p.id) : p.categories?.some(c => categories.has(c.id))));
  if (options.scope === "selected" && selected.length !== ids.size) throw new Error("Sebagian produk pilihan tidak tersedia atau belum dipublikasikan.");
  if (!selected.length) throw new Error("Tidak ada produk terpublikasi yang sesuai dengan pilihan Anda.");
  if (selected.length > 200) throw new Error("Pilih maksimal 200 produk per katalog atau gunakan filter kategori.");
  return selected;
}

/** Only explicit generic options may override a product's canonical sleeve type.
 * Imported native rows can outlive admin fields (e.g. legacy KK-001LPJ-*).
 */
export function toCatalogProduct(raw: WooCommerceProduct, native: WooCommerceProductVariation[]): CatalogProduct {
  const meta = raw.meta_data ?? [];
  const kind = getMetaString(meta, PRODUCT_KIND_META);
  const options = readVariantOptions(getMetaValue(meta, VARIANT_OPTIONS_META));
  const explicitGeneric = kind === "variable" && options.length > 0;
  const mainImage = raw.images?.[0]?.src ?? "";
  const material = getMetaString(meta, "material") || raw.attributes?.find(a => /^(material|bahan)$/i.test(a.name))?.options?.join(", ") || "";
  const colors = getMetaStringArray(meta, "available_colors").length ? getMetaStringArray(meta, "available_colors") : raw.attributes?.find(a => isColorOption(a.name))?.options ?? [];
  const sizes = getMetaStringArray(meta, "available_sizes").length ? getMetaStringArray(meta, "available_sizes") : raw.attributes?.find(a => isSizeOption(a.name))?.options ?? [];
  const configuredSleeve = normalizeSleeve(getMetaString(meta, "sleeve_type"));
  const colorValues = readProductColorValues(getMetaValue(meta, "ofissio_color_values"));
  const genericRows = explicitGeneric ? mapProductVariants(native, options) : [];
  if (kind === "variable" && (!options.length || !genericRows.length)) throw new Error(`Varian ${text(raw.name)} belum lengkap. Periksa produk di admin sebelum mengekspor.`);
  const rows = kind === "simple" ? [] : explicitGeneric ? genericRows.map(v => ({ options: v.options, sku: v.sku, image: v.imageSrc, price: v.regularPrice, hex: v.fabricColor })) : native.filter(v => v.status === "publish").map(v => ({
    options: Object.fromEntries((v.attributes ?? []).map(a => [a.name, a.option])), sku: v.sku, image: v.image?.src ?? "", price: Number(v.price || v.regular_price), hex: getMetaString(v.meta_data ?? [], "ofissio_fabric_color"),
  }));
  const groups = new Map<string, { variant: CatalogVariant; skus: { size: string; sku: string }[] }>();
  for (const row of rows) {
    const entries = Object.entries(row.options);
    const read = (match: (name: string) => boolean) => String(entries.find(([name]) => match(name))?.[1] ?? "");
    const sleeve = normalizeSleeve(read(isSleeveOption)) || configuredSleeve;
    if (!explicitGeneric && ["Pendek", "Panjang"].includes(configuredSleeve) && sleeve && sleeve !== configuredSleeve) continue;
    const color = read(isColorOption) || colors.join(" / ") || "Sesuai foto";
    const other = entries.filter(([name]) => !isSizeOption(name) && !isColorOption(name) && !isSleeveOption(name)).map(([k,v]) => `${k}: ${v}`).join(" · ");
    const key = JSON.stringify([colorNameKey(color), sleeve, other]);
    const size = sizeKey(read(isSizeOption));
    const hex = row.hex || Object.entries(colorValues ?? {}).find(([name]) => colorNameKey(name) === colorNameKey(color))?.[1] || masterColor(color)?.hex || "";
    const price = Number.isFinite(row.price) && row.price > 0 ? row.price : null;
    let group = groups.get(key);
    if (!group) {
      group = { variant: { color: text(color), colorHex: /^#[\da-f]{6}$/i.test(hex) ? hex : null, sleeve: text(sleeve), label: text(other), sku: row.sku || raw.sku, skuSize: size, sizes: [], image: row.image || mainImage, price }, skus: [] };
      groups.set(key, group);
    }
    if (size) group.skus.push({ size, sku: row.sku });
    if (price != null) group.variant.price = group.variant.price == null ? price : Math.min(price, group.variant.price);
  }
  const grouped = [...groups.values()].map(({ variant, skus }) => {
    const unique = [...new Set(skus.map(s => s.size))];
    unique.sort((a,b) => (sizeOrder.indexOf(a) < 0 ? 99 : sizeOrder.indexOf(a)) - (sizeOrder.indexOf(b) < 0 ? 99 : sizeOrder.indexOf(b)));
    const representative = skus.find(s => s.size === "S") || skus.find(s => s.size === unique[0]);
    return { ...variant, sizes: unique.length ? unique : sizes.map(sizeKey), sku: representative?.sku || variant.sku, skuSize: representative?.size || variant.skuSize };
  });
  if (!grouped.length) grouped.push({ color: text(colors.join(" / ") || "Sesuai foto"), colorHex: colors.length === 1 ? masterColor(colors[0]!)?.hex ?? null : null, sleeve: text(configuredSleeve), label: "", sku: raw.sku, skuSize: "", sizes: sizes.map(sizeKey), image: mainImage, price: Number(raw.price) > 0 ? Number(raw.price) : null });
  const used = new Set([mainImage, ...grouped.map(v => v.image)]);
  const extraImages = (raw.images ?? []).map(i => i.src).filter(src => !used.has(src) && /back|belakang|detail|close.?up/i.test(src.split("/").at(-1) ?? "")).slice(0,2);
  return { id: raw.id, name: text(raw.name), sku: raw.sku, category: text(raw.categories?.[0]?.name || "Koleksi Lainnya"), descriptionHtml: sanitizeHtml(raw.description || raw.short_description || "Deskripsi produk belum tersedia.", { allowedTags: ["p", "h1", "h2", "h3", "h4", "ul", "ol", "li", "br", "strong", "em"], allowedAttributes: {} }), material: text(material), image: mainImage, extraImages, variants: grouped };
}
