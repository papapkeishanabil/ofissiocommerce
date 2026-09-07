import "server-only";

import { inspectTrustedLegacyImage } from "@/features/product-import/product-import-legacy-image.service";
import { productImportRepository } from "@/features/product-import/product-import.repository";
import { woocommerceClient } from "@/features/products/woocommerce/woocommerce.client";
import { findWordPressMediaBySearch } from "@/features/products/woocommerce/wordpress-media-upload.service";
import { logAdminEvent } from "@/lib/security/audit-log";
import { createApiError } from "@/lib/security/safe-error-response";

type Row = Record<string, unknown>;

export const KK020_MANUAL_MEDIA = {
  productId: 728,
  sku: "KK-020",
  sourceId: "10404",
  productName: "Kemeja Kerja Putih KK-020",
  sourceUrls: [
    "https://www.ofissio.com/wp-content/uploads/2022/02/kemeja-KK-020-4-1.jpg",
    "https://www.ofissio.com/wp-content/uploads/2022/04/kemeja-KK-020-5-.jpg",
  ],
} as const;

export interface ApprovedManualMediaEvidence {
  resolutionType: "MANUAL_ADMIN_MEDIA_EVIDENCE";
  productId: number;
  sku: string;
  sourceId: string;
  sourceImages: Array<{ order: number; url: string; filename: string; sha256: string; byteCount: number; mimeType: string }>;
  evidence: string[];
  originalBatchCsvHashStillUnavailable: true;
  approvedBy: string;
  approvedAt: string;
}

export async function approveManualMediaEvidence(input: {
  batchId: string;
  productId: number;
  sourceId: string;
  acknowledged: boolean;
  typedConfirmation: string;
  actorId: string;
}) {
  if (!input.acknowledged || input.typedConfirmation.trim().toUpperCase() !== KK020_MANUAL_MEDIA.sku) {
    throw createApiError("VALIDATION_ERROR", "Konfirmasi eksplisit KK-020 wajib diisi.", 400);
  }
  if (input.productId !== KK020_MANUAL_MEDIA.productId || input.sourceId !== KK020_MANUAL_MEDIA.sourceId) {
    throw createApiError("VALIDATION_ERROR", "Identitas product/source tidak sesuai dengan bukti manual yang ditinjau.", 409);
  }
  const batch = await productImportRepository.getBatch(input.batchId);
  if (!batch) throw createApiError("NOT_FOUND", "Batch import tidak ditemukan.", 404);
  const item = (await productImportRepository.listItems(input.batchId)).find((candidate) =>
    String(candidate.source_id) === KK020_MANUAL_MEDIA.sourceId && Number(candidate.target_product_id) === KK020_MANUAL_MEDIA.productId && candidate.status === "IMPORTED",
  );
  if (!item) throw createApiError("VALIDATION_ERROR", "Ownership KK-020 pada batch tidak dapat dibuktikan.", 409);

  const product = await woocommerceClient.getProductById(KK020_MANUAL_MEDIA.productId);
  const variations = product.type === "variable" ? await woocommerceClient.getProductVariations(product.id, { per_page: 100 }) : [];
  if (product.sku.trim().toUpperCase() !== KK020_MANUAL_MEDIA.sku || product.status !== "draft" || variations.length !== 6) {
    throw createApiError("VALIDATION_ERROR", "State produk KK-020 berubah. Jalankan pemeriksaan ulang.", 409);
  }

  const inspected = [];
  for (const [index, url] of KK020_MANUAL_MEDIA.sourceUrls.entries()) {
    const image = await inspectTrustedLegacyImage(url);
    const media = await findWordPressMediaBySearch(image.filename.replace(/\.[^.]+$/, ""));
    inspected.push({
      order: index + 1,
      url,
      filename: image.filename,
      sha256: image.sha256,
      byteCount: image.byteCount,
      mimeType: image.mimeType,
      httpStatus: image.httpStatus,
      finalStatus: image.finalStatus,
      redirectHost: new URL(image.finalUrl).hostname,
      existingMediaMatches: media.filter((candidate) => mediaIdentity(candidate.sourceUrl) === mediaIdentity(image.filename)).length,
    });
  }

  const evidence: ApprovedManualMediaEvidence = {
    resolutionType: "MANUAL_ADMIN_MEDIA_EVIDENCE",
    productId: product.id,
    sku: product.sku,
    sourceId: KK020_MANUAL_MEDIA.sourceId,
    sourceImages: inspected.map(({ order, url, filename, sha256, byteCount, mimeType }) => ({ order, url, filename, sha256, byteCount, mimeType })),
    evidence: ["SOURCE_PARENT_ID_10404", "PRODUCT_NAME_KK020", "CHILD_SKU_PREFIX_KK020", "ALTERNATE_CSV_MANUAL_REVIEW"],
    originalBatchCsvHashStillUnavailable: true,
    approvedBy: input.actorId,
    approvedAt: new Date().toISOString(),
  };
  const result = batch.result_json && typeof batch.result_json === "object" && !Array.isArray(batch.result_json) ? batch.result_json as Row : {};
  const current = result.manualMediaEvidence && typeof result.manualMediaEvidence === "object" && !Array.isArray(result.manualMediaEvidence) ? result.manualMediaEvidence as Row : {};
  await productImportRepository.mergeBatchResult(input.batchId, { manualMediaEvidence: { ...current, [String(product.id)]: evidence }, integrityRepairPlanInvalidatedAt: evidence.approvedAt });
  logAdminEvent({ actorId: input.actorId, action: "manual_product_media_evidence_approved", entityType: "woocommerce_product", entityId: String(product.id), metadata: { batchId: input.batchId, sourceId: evidence.sourceId, sku: evidence.sku, resolutionType: evidence.resolutionType, sourceImages: evidence.sourceImages, originalBatchCsvHashStillUnavailable: true } });
  return { message: "Bukti media manual KK-020 disetujui. Jalankan Integrity Dry Run baru.", evidence, preflight: inspected, currentProduct: { id: product.id, sku: product.sku, status: product.status, variationCount: variations.length, imageIds: (product.images ?? []).map((image) => image.id).filter(Boolean) } };
}

export function getApprovedManualMediaEvidence(batch: Row, productId: number): ApprovedManualMediaEvidence | null {
  const result = batch.result_json && typeof batch.result_json === "object" && !Array.isArray(batch.result_json) ? batch.result_json as Row : {};
  const collection = result.manualMediaEvidence && typeof result.manualMediaEvidence === "object" && !Array.isArray(result.manualMediaEvidence) ? result.manualMediaEvidence as Row : {};
  const value = collection[String(productId)];
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const evidence = value as ApprovedManualMediaEvidence;
  return evidence.resolutionType === "MANUAL_ADMIN_MEDIA_EVIDENCE" && evidence.productId === productId ? evidence : null;
}

function mediaIdentity(value: string) {
  try { return decodeURIComponent(new URL(value).pathname.split("/").at(-1) ?? "").replace(/\.[^.]+$/, "").toLowerCase(); }
  catch { return value.split("/").at(-1)?.replace(/\.[^.]+$/, "").toLowerCase() ?? ""; }
}
