import "server-only";

import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import type { ProductImportBatchStatus, ProductImportPlan } from "./product-import.types";

type Row = Record<string, unknown>;

export const productImportRepository = {
  async createStagingBatch(input: { id: string; actorId: string; csvFilename: string; manifestFilename: string; zipFilename: string; zipSizeBytes: number; hashes: { csv: string; manifest: string }; stagingKey: string }) {
    const client = requiredClient(); const now = new Date().toISOString();
    await client.insert("product_import_batches", { id: input.id, company_id: null, source: "woocommerce", status: "PREVIEWED", csv_filename: input.csvFilename, manifest_filename: input.manifestFilename, zip_filename: input.zipFilename, csv_sha256: input.hashes.csv, manifest_sha256: input.hashes.manifest, zip_sha256: "", total_products: 0, total_variations: 0, total_images: 0, warning_count: 0, error_count: 0, plan_json: {}, result_json: { uploadState: "LOCAL_ONLY" }, staging_objects: [{ key: input.stagingKey, sizeBytes: input.zipSizeBytes, state: "READY_TO_UPLOAD" }], cleanup_required: true, created_by: input.actorId, created_at: now, updated_at: now });
  },
  async finalizeDryRun(input: { id: string; actorId: string; zipHash: string; plan: ProductImportPlan }) {
    const client = requiredClient(); const batch = await this.getBatch(input.id); if (!batch || batch.created_by !== input.actorId) throw new Error("Batch import tidak ditemukan atau bukan milik user ini.");
    const previousResult=batch.result_json&&typeof batch.result_json==="object"&&!Array.isArray(batch.result_json)?batch.result_json:{};
    await client.update("product_import_batches", { status: input.plan.summary.blocked ? "FAILED" : "DRY_RUN_PASSED", zip_sha256: input.zipHash, total_products: input.plan.summary.productsAnalyzed, total_variations: input.plan.summary.variationsReady, total_images: input.plan.summary.localImages + input.plan.summary.legacyImages, warning_count: input.plan.summary.warnings, error_count: input.plan.summary.errors, plan_json: input.plan, result_json: { ...previousResult, uploadState: "VERIFIED", dryRunError:null }, updated_at: new Date().toISOString() }, { id: input.id });
    await client.delete("product_import_items", { batch_id: input.id });
    if (input.plan.products.length) await client.insert("product_import_items", input.plan.products.map((item) => ({ id: crypto.randomUUID(), batch_id: input.id, source_id: item.sourceId, source_sku: item.sourceSku, target_sku: item.targetSku, action: item.action, status: item.action === "CREATE_DRAFT" ? "PENDING" : "SKIPPED", warning_count: item.warnings.length, metadata: { name: item.name, photoSource: item.photoSource, reason: item.reason, imageCount:item.imageCount, variationCount:item.variationCount } })));
  },
  async listBatches() { const client = requiredClient(); return client.select<Row>("product_import_batches", { order: "created_at.desc", limit: 100 }); },
  async listOwnedBatches(actorId: string) { return requiredClient().select<Row>("product_import_batches", { filters: { created_by: actorId }, order: "created_at.desc", limit: 100 }); },
  async getBatch(id: string) { const rows = await requiredClient().select<Row>("product_import_batches", { filters: { id }, limit: 1 }); return rows[0] ?? null; },
  async updateBatch(id: string, status: ProductImportBatchStatus, patch: Row = {}) { return requiredClient().update<Row>("product_import_batches", { status, updated_at: new Date().toISOString(), ...patch }, { id }); },
  async mergeBatchResult(id: string, patch: Row) {
    const batch = await this.getBatch(id);
    if (!batch) throw new Error("Batch import tidak ditemukan.");
    const current = batch.result_json && typeof batch.result_json === "object" && !Array.isArray(batch.result_json)
      ? batch.result_json as Row
      : {};
    const rows = await requiredClient().update<Row>("product_import_batches", {
      result_json: { ...current, ...patch },
      updated_at: new Date().toISOString(),
    }, { id });
    return rows[0] ?? null;
  },
  async listItems(batchId: string) { return requiredClient().select<Row>("product_import_items", { filters: { batch_id: batchId }, order: "created_at.asc" }); },
  async listItemStatuses() { return requiredClient().select<Row>("product_import_items", { select: "batch_id,status", limit: 10000 }); },
  async claimItem(batchId: string, sourceId: string) { const client=requiredClient(); let rows = await client.update<Row>("product_import_items", { status: "UPLOADING", updated_at: new Date().toISOString() }, { batch_id: batchId, source_id: sourceId, status: "PENDING" }); if(!rows.length) rows=await client.update<Row>("product_import_items", { status:"UPLOADING",error_message:null,updated_at:new Date().toISOString() }, { batch_id:batchId,source_id:sourceId,status:"FAILED",target_product_id:null }); return rows.length === 1; },
  async claimFailedItem(batchId:string,sourceId:string){const rows=await requiredClient().update<Row>("product_import_items",{status:"UPLOADING",error_message:null,updated_at:new Date().toISOString()},{batch_id:batchId,source_id:sourceId,status:"FAILED"});return rows.length===1;},
  async updateItem(batchId: string, sourceId: string, patch: Row) { return requiredClient().update<Row>("product_import_items", { ...patch, updated_at: new Date().toISOString() }, { batch_id: batchId, source_id: sourceId }); },
  async assertOwnedBatch(id: string, actorId: string) { const batch = await this.getBatch(id); if (!batch || batch.created_by !== actorId) throw new Error("Batch import tidak ditemukan atau bukan milik user ini."); return batch; },
};

function requiredClient() { const client = getSupabaseAdminClient(); if (!client) throw new Error("Supabase import tracking belum dikonfigurasi."); return client; }
