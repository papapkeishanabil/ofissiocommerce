import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getProductImportLimits } from "./product-import.config";
import { productImportRepository } from "./product-import.repository";
import { getProductImportStagingProvider } from "./staging/product-import-staging.provider";

type BatchRow = Record<string, unknown>;
type StagingObject = { key: string; sizeBytes: number; state: string };

export function productImportStagingKey(batchId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(batchId)) throw new Error("Batch ID tidak valid.");
  return `product-imports/${batchId}/source.zip`;
}

export function assertProductImportStagingKey(batchId: string, key: string) {
  const expected = productImportStagingKey(batchId);
  if (key !== expected) throw new Error("Referensi staging ZIP tidak valid.");
  return key;
}

export async function prepareProductImportUpload(input: {
  actorId: string;
  csvFilename: string;
  manifestFilename: string;
  zipFilename: string;
  zipSizeBytes: number;
  wooCsv: string;
  manifestCsv: string;
}) {
  const limits = getProductImportLimits();
  if (!input.zipFilename.toLowerCase().endsWith(".zip") || input.zipSizeBytes <= 0 || input.zipSizeBytes > limits.maxZipBytes) {
    throw new Error(`Photo Product ZIP harus .zip dan maksimal ${Math.round(limits.maxZipBytes / 1024 / 1024)} MB.`);
  }
  const batchId = randomUUID();
  const stagingKey = productImportStagingKey(batchId);
  await productImportRepository.createStagingBatch({
    id: batchId,
    actorId: input.actorId,
    csvFilename: input.csvFilename,
    manifestFilename: input.manifestFilename,
    zipFilename: input.zipFilename,
    zipSizeBytes: input.zipSizeBytes,
    hashes: { csv: sha(input.wooCsv), manifest: sha(input.manifestCsv) },
    stagingKey,
  });
  try {
    const totalChunks = Math.ceil(input.zipSizeBytes / limits.chunkBytes);
    const session = await getProductImportStagingProvider().initialize({ batchId, originalFilename: input.zipFilename, totalSize: input.zipSizeBytes, totalChunks, chunkSize: limits.chunkBytes });
    return { batchId, uploadId: session.uploadId, chunkSize: session.chunkSize, totalChunks: session.totalChunks, uploadedChunks: session.uploadedChunks, maxZipBytes: limits.maxZipBytes, provider: "local" as const };
  } catch (error) {
    await getProductImportStagingProvider().deleteBatch(batchId).catch(() => undefined);
    await productImportRepository.updateBatch(batchId, "FAILED", { result_json: { uploadState: "UPLOAD_FAILED" } }).catch(() => undefined);
    throw error;
  }
}

export async function getProductImportUploadStatus(input: { batchId: string; uploadId: string; actorId: string }) {
  const batch = await productImportRepository.assertOwnedBatch(input.batchId, input.actorId);
  if (batch.status !== "PREVIEWED") throw new Error("Status batch tidak mengizinkan upload ZIP.");
  return getProductImportStagingProvider().getUploadStatus({ batchId: input.batchId, uploadId: input.uploadId });
}

export async function writeProductImportChunk(input: { batchId: string; uploadId: string; chunkIndex: number; actorId: string; body: ReadableStream<Uint8Array>; contentLength: number | null }) {
  await productImportRepository.assertOwnedBatch(input.batchId, input.actorId);
  return getProductImportStagingProvider().writeChunk(input);
}

export async function markProductImportUploadComplete(input: { batchId: string; uploadId: string; actorId: string }) {
  const batch = await productImportRepository.assertOwnedBatch(input.batchId, input.actorId);
  const staging = stagingFromBatch(batch, input.batchId);
  const finalized = await getProductImportStagingProvider().finalize({ batchId: input.batchId, uploadId: input.uploadId });
  if (finalized.sizeBytes !== staging.sizeBytes) throw new Error("Upload ZIP belum lengkap atau ukuran object tidak sesuai.");
  await productImportRepository.updateBatch(input.batchId, "PREVIEWED", {
    zip_sha256: finalized.sha256, staging_objects: [{ ...staging, state: "UPLOAD_COMPLETE", provider: "local" }], result_json: { uploadState: "UPLOAD_COMPLETE" },
  });
  return { batchId: input.batchId, sizeBytes: finalized.sizeBytes, sha256: finalized.sha256, state: "UPLOAD_COMPLETE" as const };
}

export async function withStagedProductZip<T>(input: {
  batchId: string;
  actorId: string;
  callback: (file: { filePath: string; sizeBytes: number; sha256: string; batch: BatchRow }) => Promise<T>;
}) {
  const batch = await productImportRepository.assertOwnedBatch(input.batchId, input.actorId);
  const staging = stagingFromBatch(batch, input.batchId);
  return getProductImportStagingProvider().withFinalizedFile({ batchId: input.batchId, callback: async (file) => { if(file.sizeBytes!==staging.sizeBytes)throw new Error("Ukuran staged ZIP berubah atau upload belum lengkap.");return input.callback({...file,batch}); } });
}

export async function cleanupProductImportBatch(input: { batchId: string; actorId: string; failed?: boolean }) {
  const batch = await productImportRepository.assertOwnedBatch(input.batchId, input.actorId);
  const staging = stagingFromBatch(batch, input.batchId);
  await getProductImportStagingProvider().deleteBatch(input.batchId).catch(() => undefined);
  await productImportRepository.updateBatch(input.batchId, input.failed ? "FAILED" : "CANCELLED", {
    staging_objects: [], cleanup_required: false, result_json: { uploadState: input.failed ? "UPLOAD_FAILED" : "CANCELLED" },
  });
}

export async function markStagedZipVerified(input: { batchId: string; actorId: string; sha256: string; preview?:unknown; verification?:unknown }) {
  const batch = await productImportRepository.assertOwnedBatch(input.batchId, input.actorId);
  const staging = stagingFromBatch(batch, input.batchId);
  const previous=batch.result_json&&typeof batch.result_json==="object"&&!Array.isArray(batch.result_json)?batch.result_json:{};
  await productImportRepository.updateBatch(input.batchId, "PREVIEWED", {
    zip_sha256: input.sha256, staging_objects: [{ ...staging, state: "VERIFIED" }], result_json: { ...previous, uploadState: "VERIFIED", ...(input.preview?{preview:input.preview}:{}), ...(input.verification?{verification:input.verification}:{}) },
  });
}

export function assertBatchSourceHashes(batch: BatchRow, wooCsv: string, manifestCsv: string) {
  if (batch.csv_sha256 !== sha(wooCsv) || batch.manifest_sha256 !== sha(manifestCsv)) throw new Error("CSV atau manifest berbeda dari batch upload.");
}

function stagingFromBatch(batch: BatchRow, batchId: string): StagingObject {
  const objects = Array.isArray(batch.staging_objects) ? batch.staging_objects : [];
  const object = objects[0] as Partial<StagingObject> | undefined;
  if (!object || typeof object.key !== "string" || typeof object.sizeBytes !== "number") throw new Error("Referensi staged ZIP belum tersedia.");
  return { key: assertProductImportStagingKey(batchId, object.key), sizeBytes: object.sizeBytes, state: String(object.state ?? "UNKNOWN") };
}

function sha(value: string | Uint8Array) { return createHash("sha256").update(value).digest("hex"); }
