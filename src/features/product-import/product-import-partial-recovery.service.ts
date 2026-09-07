import "server-only";

import { woocommerceClient } from "@/features/products/woocommerce/woocommerce.client";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createApiError } from "@/lib/security/safe-error-response";
import { executeProductImport } from "./product-import-execute.service";
import { assessPartialImportProduct, type PartialImportAssessment } from "./product-import-partial-recovery";
import { productImportRepository } from "./product-import.repository";
import { assertBatchSourceHashes, withStagedProductZip } from "./product-import-staging.service";
import type { ProductImportPlan } from "./product-import.types";

type Row = Record<string, unknown>;

export async function inspectPartialImportProducts(input: { batch: Row; items: Row[] }) {
  const plan = input.batch.plan_json as ProductImportPlan | undefined;
  if (!plan?.products) return [];
  const results: PartialImportAssessment[] = [];
  for (const item of input.items.filter((row) => row.status === "FAILED" && row.action === "CREATE_DRAFT")) {
    const planned = plan.products.find((candidate) => candidate.sourceId === String(item.source_id));
    const sku = String(item.target_sku ?? planned?.targetSku ?? "");
    if (!planned || !sku) continue;
    const products = await woocommerceClient.getProducts({ sku, status: "any", per_page: 10 }).catch(() => []);
    for (const product of products.filter((candidate) => candidate.sku === sku)) {
      results.push(assessPartialImportProduct({ batch: input.batch, item, planned: planned as unknown as Row, product }));
    }
  }
  return results;
}

export async function recoverPartialImportProduct(input: { batchId: string; sourceId: string; productId: number; actorId: string; wooCsv: string; manifestCsv: string }) {
  return withStagedProductZip({ batchId: input.batchId, actorId: input.actorId, callback: async ({ filePath, sha256, batch }) => {
    assertBatchSourceHashes(batch, input.wooCsv, input.manifestCsv);
    const items = await productImportRepository.listItems(input.batchId);
    const assessment = (await inspectPartialImportProducts({ batch, items })).find((candidate) => candidate.sourceId === input.sourceId && candidate.productId === input.productId);
    if (!assessment || assessment.state !== "PARTIAL_IMPORT_PRODUCT") throw createApiError("VALIDATION_ERROR", "Kondisi produk berubah. Recovery dihentikan dan perlu review manual.", 409);
    const item = items.find((candidate) => String(candidate.source_id) === input.sourceId);
    const metadata = object(item?.metadata);
    await productImportRepository.updateItem(input.batchId, input.sourceId, { metadata: { ...metadata, rollbackState: "ROLLBACK_PENDING", rollbackProductId: input.productId } });
    try {
      const deleted = await woocommerceClient.deleteProductAndConfirm(input.productId);
      if (!deleted) throw new Error("Woo product masih ditemukan setelah delete.");
      await productImportRepository.updateItem(input.batchId, input.sourceId, { target_product_id: null, metadata: { ...metadata, rollbackState: "ROLLBACK_COMPLETE", rollbackProductId: input.productId, rollbackCompletedAt: new Date().toISOString() } });
    } catch (error) {
      await productImportRepository.updateItem(input.batchId, input.sourceId, { metadata: { ...metadata, rollbackState: "ROLLBACK_FAILED", rollbackProductId: input.productId } });
      throw error;
    }
    logAuditEvent({ action: "product_import_partial_recovered", entityType: "woocommerce_product", entityId: String(input.productId), actorId: input.actorId, metadata: { batchId: input.batchId, sourceId: input.sourceId, sku: assessment.sku } });
    return executeProductImport({ batchId: input.batchId, wooCsv: input.wooCsv, manifestCsv: input.manifestCsv, zipFilePath: filePath, zipHash: sha256 });
  }});
}

function object(value: unknown): Row { return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {}; }
