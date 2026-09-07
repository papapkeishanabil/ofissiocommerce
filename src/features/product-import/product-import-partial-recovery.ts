import type { WooCommerceProduct } from "@/features/products/woocommerce/woocommerce.types";

export type PartialImportRecoveryState = "PARTIAL_IMPORT_PRODUCT" | "MANUAL_REVIEW_REQUIRED";

export type PartialImportAssessment = {
  state: PartialImportRecoveryState;
  productId: number;
  sourceId: string;
  sku: string;
  name: string;
  status: string;
  expectedVariations: number;
  expectedImages: number;
  actualVariations: number;
  actualImages: number;
  evidence: string[];
  blockers: string[];
};

type Row = Record<string, unknown>;

export function assessPartialImportProduct(input: {
  batch: Row;
  item: Row;
  planned: Row;
  product: WooCommerceProduct;
}): PartialImportAssessment {
  const { batch, item, planned, product } = input;
  const metadata = object(item.metadata);
  const productMeta = new Map((product.meta_data ?? []).map((entry) => [entry.key, String(entry.value ?? "")]));
  const expectedVariations = Number(metadata.variationCount ?? planned.variationCount ?? 0);
  const expectedImages = Number(metadata.imageCount ?? planned.imageCount ?? 0);
  const actualVariations = product.variations?.length ?? 0;
  const actualImages = product.images?.length ?? 0;
  const expectedSku = String(item.target_sku ?? planned.targetSku ?? "");
  const expectedName = String(metadata.name ?? planned.name ?? "");
  const sourceId = String(item.source_id ?? planned.sourceId ?? "");
  const batchId = String(batch.id ?? "");
  const explicitOwner = productMeta.get("_ofissio_import_batch_id") === batchId && productMeta.get("_ofissio_import_source_id") === sourceId;
  const legacyOwner = productMeta.get("_ofissio_import_source") === "woocommerce_csv" && productMeta.get("_ofissio_source_id") === sourceId;
  const temporalOwner = dateInsideBatch(product.date_created_gmt ?? product.date_created, batch);
  const evidence: string[] = [];
  const blockers: string[] = [];

  check(product.sku === expectedSku, "SKU cocok dengan import plan", "SKU Woo tidak cocok dengan target plan");
  check(product.name === expectedName, "Nama cocok dengan import plan", "Nama Woo tidak cocok dengan import plan");
  check(product.status === "draft", "Produk masih draft", "Produk bukan draft");
  check(product.type === "variable", "Tipe produk variable", "Tipe produk bukan variable");
  check(item.action === "CREATE_DRAFT", "Item direncanakan CREATE_DRAFT", "Action item bukan CREATE_DRAFT");
  check(item.status === "FAILED", "Item tracking berstatus FAILED", "Item tracking bukan FAILED");
  check(expectedVariations > 0, `${expectedVariations} variasi direncanakan`, "Jumlah variasi rencana tidak valid");
  check(expectedImages > 0, `${expectedImages} gambar direncanakan`, "Jumlah gambar rencana tidak valid");
  check(actualVariations === 0, "Produk belum memiliki variasi", "Produk sudah memiliki variasi");
  check(actualImages === 0, "Produk belum memiliki gambar", "Produk sudah memiliki gambar");
  check(explicitOwner || (legacyOwner && temporalOwner), explicitOwner ? "Marker batch dan source ID cocok" : "Marker source dan waktu batch cocok", "Kepemilikan produk oleh batch tidak terbukti");

  return { state: blockers.length ? "MANUAL_REVIEW_REQUIRED" : "PARTIAL_IMPORT_PRODUCT", productId: product.id, sourceId, sku: product.sku, name: product.name, status: product.status, expectedVariations, expectedImages, actualVariations, actualImages, evidence, blockers };

  function check(ok: boolean, proof: string, blocker: string) { if (ok) evidence.push(proof); else blockers.push(blocker); }
}

function dateInsideBatch(value: string | undefined, batch: Row) {
  if (!value) return false;
  const created = parseDate(value);
  const start = parseDate(String(batch.created_at ?? ""));
  const end = parseDate(String(batch.completed_at ?? batch.updated_at ?? ""));
  if (!created || !start || !end) return false;
  const margin = 2 * 60 * 60 * 1000;
  return created >= start - margin && created <= end + margin;
}

function parseDate(value: string) {
  const normalized = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?$/.test(value) ? `${value}Z` : value;
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function object(value: unknown): Row { return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {}; }
