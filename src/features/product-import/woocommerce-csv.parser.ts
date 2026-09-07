import Papa from "papaparse";
import { normalizeAttributeName, normalizeAttributeValue, normalizeSku } from "./product-import.normalization";
import type { WooCommerceImportProduct, WooImportAttribute, WooImportIndex } from "./product-import.types";

const REQUIRED = ["id", "type", "sku", "name"];
const keyOf = (row: Record<string, string>, wanted: string) => Object.keys(row).find((key) => key.trim().toLowerCase() === wanted.toLowerCase());
const get = (row: Record<string, string>, name: string) => row[keyOf(row, name) ?? ""]?.trim() ?? "";
const list = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const money = (value: string) => value === "" || !Number.isFinite(Number(value)) ? null : Number(value);

function parseAttributes(row: Record<string, string>): WooImportAttribute[] {
  const numbers = new Set<number>();
  for (const key of Object.keys(row)) { const match = /^attribute\s+(\d+)\s+name$/i.exec(key.trim()); if (match?.[1]) numbers.add(Number(match[1])); }
  return [...numbers].sort((a, b) => a - b).flatMap((number) => {
    const name = get(row, `Attribute ${number} name`); if (!name) return [];
    return [{ name: normalizeAttributeName(name), values: list(get(row, `Attribute ${number} value(s)`)).map(normalizeAttributeValue), visible: get(row, `Attribute ${number} visible`) === "1", global: get(row, `Attribute ${number} global`) === "1" }];
  });
}

export function parseWooCommerceCsv(csv: string): WooImportIndex {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: "greedy", transformHeader: (header) => header.trim() });
  const fatalError = parsed.errors.find((error) => error.type !== "FieldMismatch");
  if (fatalError) throw new Error(`CSV WooCommerce tidak valid: ${fatalError.message}`);
  const fields = (parsed.meta.fields ?? []).map((field) => field.toLowerCase());
  const missing = REQUIRED.filter((field) => !fields.includes(field));
  if (missing.length) throw new Error(`Header WooCommerce wajib tidak tersedia: ${missing.join(", ")}`);
  const rows: WooCommerceImportProduct[] = parsed.data.map((row, index) => {
    const sourceType = get(row, "Type").toLowerCase();
    const productType = (["simple", "variable", "variation", "external"].includes(sourceType) ? sourceType : "unknown") as WooCommerceImportProduct["productType"];
    const parentRaw = get(row, "Parent"); const explicitParentId = parentRaw.toLowerCase().startsWith("id:") ? parentRaw.slice(3).trim() : null;
    // Some Woo exports contain a bare numeric parent ID instead of `id: 123`.
    // Treating it as a SKU silently orphaned valid variation rows.
    const parentId = explicitParentId ?? (/^\d+(?:\.0+)?$/.test(parentRaw) ? parentRaw.replace(/\.0+$/, "") : null);
    const parentSku = parentRaw && !parentId ? parentRaw.replace(/^sku:/i, "").trim() : null;
    const attributes = parseAttributes(row); const sku = get(row, "SKU") || null;
    const fallback = attributes.map((attribute) => `${attribute.name}=${attribute.values.join("+")}`).join("|") || `ROW=${index + 2}`;
    return { sourceId: get(row, "ID") || `row-${index + 2}`, sourceType, sku, name: get(row, "Name"), parentSku, parentId, productType, published: ["1", "true"].includes(get(row, "Published").toLowerCase()), shortDescription: get(row, "Short description"), description: get(row, "Description"), regularPrice: money(get(row, "Regular price")), salePrice: money(get(row, "Sale price")), categories: list(get(row, "Categories")), tags: list(get(row, "Tags")), attributes, imageUrls: list(get(row, "Images")), rawRow: row, internalKey: sku ? normalizeSku(sku) : `${normalizeSku(parentSku ?? parentId)}::${fallback}` };
  });
  const byId = new Map(rows.map((row) => [row.sourceId, row])); const bySku = new Map(rows.filter((row) => row.sku).map((row) => [normalizeSku(row.sku), row]));
  const variationsByParentId = new Map<string, WooCommerceImportProduct[]>();
  for (const variation of rows.filter((row) => row.productType === "variation")) {
    const id = variation.parentId ?? (variation.parentSku ? bySku.get(normalizeSku(variation.parentSku))?.sourceId : undefined);
    if (!id) continue;
    if (!variation.sku) {
      const resolvedParentSku = byId.get(id)?.sku ?? variation.parentSku ?? id;
      variation.internalKey = `${normalizeSku(resolvedParentSku)}::${variation.attributes.map((attribute) => `${attribute.name}=${attribute.values.join("+")}`).join("|") || `ID=${variation.sourceId}`}`;
    }
    variationsByParentId.set(id, [...(variationsByParentId.get(id) ?? []), variation]);
  }
  return { rows, parents: rows.filter((row) => row.productType !== "variation"), byId, bySku, variationsByParentId };
}
