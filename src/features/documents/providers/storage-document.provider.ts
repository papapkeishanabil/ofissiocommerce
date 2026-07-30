import "server-only";

import { randomUUID } from "node:crypto";

import { logInternalError } from "@/lib/security/safe-error-response";
import { sanitizeFilename } from "@/lib/security/upload-security";
import { uploadedFileRepository } from "@/features/storage/storage.repository";
import { getStorageRuntimeConfig } from "@/features/storage/storage.config";
import { mockStorageProvider } from "@/features/storage/providers/mock-storage.provider";
import { s3StorageProvider } from "@/features/storage/providers/s3-storage.provider";
import { supabaseStorageProvider } from "@/features/storage/providers/supabase-storage.provider";
import type {
  StorageObjectProvider,
  UploadedFile,
} from "@/features/storage/storage.types";

import type { DocumentType } from "../document.types";
import { buildDocumentStorageKey } from "../document.utils";

function activeObjectProvider(): StorageObjectProvider {
  const config = getStorageRuntimeConfig();
  if (config.provider === "supabase") return supabaseStorageProvider;
  if (config.provider === "s3") return s3StorageProvider;
  return mockStorageProvider;
}

export async function uploadGeneratedPdf(input: {
  companyId: string;
  userId: string | null;
  documentType: DocumentType;
  documentNumber: string;
  filename: string;
  data: Uint8Array;
  metadata: Record<string, unknown>;
}) {
  const config = getStorageRuntimeConfig();
  const provider = activeObjectProvider();
  const bucket = config.buckets.documents;
  const now = new Date().toISOString();
  const safeFilename = sanitizeFilename(input.filename.endsWith(".pdf") ? input.filename : `${input.filename}.pdf`);
  const storageKey = buildDocumentStorageKey({
    companyId: input.companyId,
    documentType: input.documentType,
    documentNumber: input.documentNumber,
  });
  const metadata = {
    ...input.metadata,
    activeStorageProvider: provider.name,
    requestedStorageProvider: config.requestedProvider,
    generatedBy: "ofissio_document_service",
  };

  await provider.uploadObject({
    bucket,
    key: storageKey,
    mimeType: "application/pdf",
    data: input.data,
    metadata,
  });

  const file: UploadedFile = {
    id: `file_${randomUUID()}`,
    companyId: input.companyId,
    userId: input.userId ?? "system",
    fileType:
      input.documentType === "invoice_pdf"
        ? "invoice_document"
        : "quotation_attachment",
    originalFilename: input.filename,
    safeFilename,
    storageProvider: provider.name,
    storageBucket: bucket,
    storageKey,
    mimeType: "application/pdf",
    extension: "pdf",
    sizeBytes: input.data.byteLength,
    status: "validated",
    publicUrl: null,
    signedUrlExpiresAt: null,
    metadata,
    checksum: null,
    scanStatus: "skipped",
    sanitizedStatus: "not_required",
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    return await uploadedFileRepository.save(file);
  } catch (error) {
    logInternalError(error, {
      area: "documents",
      action: "document_file_metadata_save_failed",
      documentType: input.documentType,
      storageBucket: bucket,
    });
    await provider.deleteObject({ bucket, key: storageKey }).catch((deleteError) => {
      logInternalError(deleteError, {
        area: "documents",
        action: "document_orphan_rollback_failed",
        documentType: input.documentType,
        storageBucket: bucket,
      });
    });
    throw new Error("Metadata file dokumen belum dapat disimpan.");
  }
}

export async function getGeneratedPdfSignedUrl(input: {
  bucket: string;
  key: string;
  mimeType: string;
}) {
  const config = getStorageRuntimeConfig();
  return activeObjectProvider().getSignedUrl({
    bucket: input.bucket,
    key: input.key,
    mimeType: input.mimeType,
    expiresInSeconds: config.signedUrlExpiresSeconds,
  });
}
