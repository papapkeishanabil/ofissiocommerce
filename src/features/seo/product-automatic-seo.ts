import type { WooCommerceProduct } from "@/features/products/woocommerce/woocommerce.types";

/** Explicit catalog evidence only: never use display defaults as specifications. */
export interface ProductSeoInput {
  name: string;
  modelCode: string;
  description: string;
  materials: string[];
  colors: string[];
  sleeves: string[];
}

export function productSeoText(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/&amp;/gi, "&").replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&quot;|&#34;/gi, '"').replace(/&#39;|&#x27;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/\\[nr]/g, " ").replace(/\s+/g, " ").trim();
}
const key = (value: string) => productSeoText(value).toLocaleLowerCase("id-ID");
function unique(values: string[]) {
  return [...new Map(values.map(productSeoText).filter(value => value && !/^(default|unknown|n\/a|none|-|material belum diisi|belum tersedia)$/i.test(value)).map(value => [key(value), value])).values()];
}
function strings(value: unknown): string[] {
  if (typeof value === "string") { try { return strings(JSON.parse(value)); } catch { return value ? [value] : []; } }
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}
function rows(value: unknown): Record<string, unknown>[] {
  if (typeof value === "string") { try { return rows(JSON.parse(value)); } catch { return []; } }
  return Array.isArray(value) ? value.filter(v => v && typeof v === "object") : [];
}
const axis = (name: string): "materials" | "colors" | "sleeves" | undefined => {
  const value = key(name).replace(/^pa[_-]/, "").replace(/[_-]+/g, " ");
  if (/^(material|materials|bahan)$/.test(value)) return "materials";
  if (/^(warna|color|colour)$/.test(value)) return "colors";
  if (/^(lengan|tipe lengan|panjang lengan|sleeve|sleeve type)$/.test(value)) return "sleeves";
};

/** Used by both Woo admin hydration and the public product mapper. */
export function productSeoInputFromWoo(product: WooCommerceProduct): ProductSeoInput {
  const meta = product.meta_data ?? [];
  const value = (name: string) => meta.find(row => row.key === name)?.value;
  const result: ProductSeoInput = {
    name: productSeoText(product.name), modelCode: productSeoText(String(value("ofissio_model_code") || product.sku || "")),
    description: productSeoText(product.description || product.short_description || ""),
    materials: strings(value("material")), colors: strings(value("available_colors")), sleeves: strings(value("sleeve_type")),
  };
  for (const attribute of product.attributes ?? []) {
    const field = axis(attribute.slug || attribute.name);
    if (field) result[field].push(...(attribute.options ?? []));
  }
  for (const option of rows(value("ofissio_variant_options"))) {
    const field = axis(String(option.name ?? ""));
    if (field) result[field].push(...strings(option.values));
  }
  for (const variant of rows(value("ofissio_product_variants"))) {
    if (!variant.options || typeof variant.options !== "object") continue;
    for (const [name, option] of Object.entries(variant.options)) {
      const field = axis(name); if (field && typeof option === "string") result[field].push(option);
    }
  }
  for (const variant of [...rows(value("ofissio_color_variants")), ...rows(value("ofissio_color_size_variants")), ...rows(value("ofissio_live_purchase_variants"))]) {
    if (typeof variant.color === "string") result.colors.push(variant.color);
    if (typeof variant.sleeve === "string") result.sleeves.push(variant.sleeve);
  }
  for (const field of ["materials", "colors", "sleeves"] as const) result[field] = unique(result[field]);
  return result;
}

export interface ProductSeoEditorValues {
  name: string; modelCode?: string; sku: string; description: string;
  materials: string[]; colors: string[]; sleeveType: string;
}
export interface ProductSeoEditorVariants {
  options: { name: string; values: string[] }[];
  variants: { options: Record<string, string> }[];
  colors: { color: string }[];
}
/** Keep untouched source evidence, including absence/conflicts hidden by legacy form defaults. */
export function productSeoInputFromEditor(values: ProductSeoEditorValues, initial: ProductSeoEditorValues,
  source: ProductSeoInput | undefined, variants: ProductSeoEditorVariants, original: ProductSeoEditorVariants): ProductSeoInput {
  const changed = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);
  const variantChanged = changed(variants, original);
  const result: ProductSeoInput = {
    name: values.name, description: values.description,
    modelCode: values.modelCode || values.sku,
    materials: source && !changed(values.materials, initial.materials) ? [...source.materials] : [...values.materials],
    colors: source && !variantChanged && !changed(values.colors, initial.colors) ? [...source.colors] : [...values.colors],
    sleeves: source && !variantChanged && values.sleeveType === initial.sleeveType ? [...source.sleeves] : [values.sleeveType],
  };
  if (variantChanged || !source) {
    for (const option of variants.options) { const field = axis(option.name); if (field) result[field].push(...option.values); }
    for (const row of variants.variants) for (const [name, value] of Object.entries(row.options)) { const field = axis(name); if (field) result[field].push(value); }
    result.colors.push(...variants.colors.map(row => row.color));
  }
  return result;
}

function sleeve(value: string) {
  const normalized = key(value);
  return /^(short|pendek|lengan pendek|short sleeve)$/.test(normalized) ? "pendek"
    : /^(long|panjang|lengan panjang|long sleeve)$/.test(normalized) ? "panjang" : undefined;
}

export function productAutomaticSeo(input: ProductSeoInput) {
  const issues: string[] = [];
  const materials = unique(input.materials), colors = unique(input.colors);
  const sleeveValues = unique(input.sleeves.map(value => sleeve(value) ?? `unknown:${value}`));
  if (materials.length > 1) issues.push("multiple-materials");
  if (colors.length > 1) issues.push("multiple-colors");
  if (sleeveValues.length > 1 || sleeveValues.some(v => v.startsWith("unknown:"))) issues.push("multiple-or-unknown-sleeves");
  const material = materials.length === 1 ? materials[0] : undefined;
  const color = colors.length === 1 ? colors[0] : undefined;
  const sleeveType = sleeveValues.length === 1 && !sleeveValues[0]!.startsWith("unknown:") ? sleeveValues[0] : undefined;
  let name = productSeoText(input.name).replace(/\bofissio\b/gi, " ").replace(/\s+/g, " ").replace(/^[\s|,–—-]+|[\s|,–—-]+$/g, "");
  const nameCode = name.match(/\b[A-Z]{1,8}-\d{2,6}\b/i)?.[0];
  const model = nameCode || productSeoText(input.modelCode);
  // Technical use must be stated in the source, never inferred from a model-code prefix.
  if (/^kemeja kerja\b/i.test(name) && !/teknisi/i.test(name) && /(?:untuk|sebagai|dirancang)[^.]{0,120}\b(?:teknisi|mekanik)\b/i.test(productSeoText(input.description))) name = name.replace(/^kemeja kerja/i, "Kemeja Kerja Teknisi");
  let identity = name;
  if (model && name.toLowerCase().endsWith(model.toLowerCase())) identity = name.slice(0, -model.length).trim();
  if (!identity) identity = name || model || "Produk";
  // Refrain from adding an attribute already present in the actual model/series name.
  const add = (base: string, value?: string) => value && !key(base).includes(key(value)) ? `${base} ${value}` : base;
  const containsModel = (text: string) => model && new RegExp(`\\b${model.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
  const displayColor = color?.replace(/\p{L}+/gu, word => `${word[0]!.toLocaleUpperCase("id-ID")}${word.slice(1).toLocaleLowerCase("id-ID")}`);
  let titleName = add(identity, material); titleName = add(titleName, displayColor || (sleeveType ? `Lengan ${sleeveType[0]!.toUpperCase()}${sleeveType.slice(1)}` : undefined));
  if (model && !containsModel(titleName)) titleName += ` ${model}`;
  const title = `${titleName} | OFISSIO`;
  const category = identity.match(/^(Kemeja(?: (?:Kerja|Lapangan|Safety|Kantor))?(?: (?:Teknisi|Wanita|Casual))?|Jaket(?: Kantor)?|Rompi|Wearpack|Kaos Polo|Celana|Topi)/i)?.[0] || identity;
  // Preserve series names: two multi-color series can share a material and sleeve.
  let description = identity.replace(category, `${category[0]!.toLocaleUpperCase("id-ID")}${category.slice(1).toLocaleLowerCase("id-ID")}`);
  if (model && !containsModel(description)) description += ` ${model}`;
  const attributes = [material ? `berbahan ${material}` : "", color ? `warna ${color.toLocaleLowerCase("id-ID")}` : "", sleeveType ? `lengan ${sleeveType}` : ""].filter(Boolean);
  if (attributes.length) description += ` ${attributes.length > 2 ? `${attributes.slice(0,-1).join(", ")}, dan ${attributes.at(-1)}` : attributes.join(" dan ")}`;
  description += ". Lihat detail model dan pilihan ukuran di OFISSIO.";
  if (!model) issues.push("missing-model-code");
  if (!material && !color && !sleeveType) issues.push("no-unambiguous-attributes");
  const series = identity.slice(category.length).trim().replace(/^[\s-]+/, "");
  return { title, description,
    suggestedKeywords: { primaryKeyword: [category.toLocaleLowerCase("id-ID"), material, color?.toLocaleLowerCase("id-ID") || series || (sleeveType ? `lengan ${sleeveType}` : model)].filter(Boolean).join(" "),
      relatedKeywords: unique([`${category}${model ? ` ${model}` : ""}`, material ? `${category} ${material}` : "", color ? `${category} ${color.toLocaleLowerCase("id-ID")}` : ""]) },
    evidence: { model, material, color, sleeve: sleeveType }, issues };
}
