import "server-only";

import { randomUUID } from "node:crypto";

import {
  generateSafeStorageKey,
  sanitizeFilename,
  validateUploadFile,
} from "@/lib/security/upload-security";
import { logUploadEvent } from "@/lib/security/audit-log";
import { logInternalError } from "@/lib/security/safe-error-response";

import { getStorageRuntimeConfig } from "./storage.config";
import { getStorageRuleForFileType, extensionFromFilename } from "./storage.mapper";
import { uploadedFileRepository } from "./storage.repository";
import type {
  StorageFileType,
  StorageObjectProvider,
  UploadedFile,
  UploadedFileListFilter,
  UploadFileInput,
} from "./storage.types";
import { mockStorageProvider } from "./providers/mock-storage.provider";
import { s3StorageProvider } from "./providers/s3-storage.provider";
import { supabaseStorageProvider } from "./providers/supabase-storage.provider";

function activeObjectProvider(): StorageObjectProvider {
  const config = getStorageRuntimeConfig();
  if (config.provider === "supabase") return supabaseStorageProvider;
  if (config.provider === "s3") return s3StorageProvider;
  return mockStorageProvider;
}

export function getUploadBucketForFileType(fileType: StorageFileType) {
  const config = getStorageRuntimeConfig();
  const rule = getStorageRuleForFileType(fileType, config);
  return config.buckets[rule.bucketPurpose];
}

export function createStorageKey(input: {
  companyId: string;
  fileType: StorageFileType;
  filename: string;
}) {
  return generateSafeStorageKey({
    companyId: input.companyId,
    kind: "custom",
    filename: input.filename,
    folder: input.fileType,
  });
}

export function validateUploadRequest(input: Omit<UploadFileInput, "data">) {
  const config = getStorageRuntimeConfig();
  const rule = getStorageRuleForFileType(input.fileType, config);
  return validateUploadFile({
    fileName: input.originalFilename,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    kind: "custom",
    companyId: input.companyId,
    request: input.request,
    allowedExtensions: rule.extensions,
    allowedMimeTypes: rule.mimeTypes,
    maxBytes: rule.maxBytes,
    folder: input.fileType,
  });
}

export async function uploadFile(input: UploadFileInput): Promise<UploadedFile> {
  const validation = validateUploadRequest(input);
  if (!validation.ok || !validation.storageKey) {
    throw new Error(validation.reason ?? "File upload tidak valid.");
  }

  const config = getStorageRuntimeConfig();
  const rule = getStorageRuleForFileType(input.fileType, config);
  const bucket = config.buckets[rule.bucketPurpose];
  const provider = activeObjectProvider();
  const safeFilename = sanitizeFilename(input.originalFilename);
  const extension = extensionFromFilename(safeFilename);
  const storageKey = validation.storageKey;
  const now = new Date().toISOString();
  const metadata = {
    ...(input.metadata ?? {}),
    requiresSvgSanitization: input.mimeType === "image/svg+xml",
    antivirusScan: "todo",
    requestedStorageProvider: config.requestedProvider,
    activeStorageProvider: config.provider,
  };

  try {
    const object = await provider.uploadObject({
      bucket,
      key: storageKey,
      mimeType: input.mimeType,
      data: input.data,
      metadata,
    });
    const record: UploadedFile = {
      id: `file_${randomUUID()}`,
      companyId: input.companyId,
      userId: input.userId,
      fileType: input.fileType,
      originalFilename: input.originalFilename,
      safeFilename,
      storageProvider: provider.name,
      storageBucket: bucket,
      storageKey,
      mimeType: input.mimeType,
      extension,
      sizeBytes: input.sizeBytes,
      status: "uploaded",
      publicUrl: object.publicUrl,
      signedUrlExpiresAt: null,
      metadata,
      checksum: null,
      scanStatus: "skipped",
      sanitizedStatus: input.mimeType === "image/svg+xml" ? "required" : "not_required",
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await uploadedFileRepository.save(record);
    } catch (error) {
      logInternalError(error, {
        area: "storage_service",
        action: "metadata_save_failed",
        storageProvider: provider.name,
        storageBucket: bucket,
        fileType: input.fileType,
      });
      await provider
        .deleteObject({ bucket, key: storageKey })
        .catch((deleteError) => {
          logInternalError(deleteError, {
            area: "storage_service",
            action: "rollback_delete_failed",
            storageProvider: provider.name,
            storageBucket: bucket,
            fileType: input.fileType,
          });
        });
      logUploadEvent({
        request: input.request,
        actorId: input.userId,
        actorType: "customer",
        companyId: input.companyId,
        action: "file_upload_orphan_rollback",
        entityId: null,
        metadata: {
          fileType: input.fileType,
          storageProvider: provider.name,
          storageBucket: bucket,
        },
      });
      throw new Error("Metadata upload belum dapat disimpan.");
    }
    logUploadEvent({
      request: input.request,
      actorId: input.userId,
      actorType: "customer",
      companyId: input.companyId,
      action: "file_uploaded",
      entityId: record.id,
      metadata: {
        fileType: record.fileType,
        mimeType: record.mimeType,
        sizeBytes: record.sizeBytes,
        storageProvider: record.storageProvider,
        storageBucket: record.storageBucket,
      },
    });
    return record;
  } catch (error) {
    logUploadEvent({
      request: input.request,
      actorId: input.userId,
      actorType: "customer",
      companyId: input.companyId,
      action: "file_upload_failed",
      entityId: null,
      metadata: {
        fileType: input.fileType,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    });
    throw error;
  }
}

export async function getFileById(input: { companyId: string; fileId: string }) {
  return uploadedFileRepository.getFileById(input);
}

export async function getFilesByCompany(
  companyId: string,
  filter: UploadedFileListFilter = {},
) {
  const files = await uploadedFileRepository.listFilesByCompany(companyId, filter);
  return files.filter((file) => file.status !== "deleted");
}

export async function getSignedFileUrl(input: {
  companyId: string;
  fileId: string;
}) {
  const file = await getFileById(input);
  if (!file || file.status === "deleted" || file.status === "rejected") {
    return null;
  }
  const config = getStorageRuntimeConfig();
  const signed = await activeObjectProvider().getSignedUrl({
    bucket: file.storageBucket,
    key: file.storageKey,
    mimeType: file.mimeType,
    expiresInSeconds: config.signedUrlExpiresSeconds,
  });
  await uploadedFileRepository.update(file.id, {
    signedUrlExpiresAt: signed.expiresAt,
  });
  logUploadEvent({
    actorId: file.userId,
    actorType: "customer",
    companyId: file.companyId,
    action: "file_signed_url_created",
    entityId: file.id,
    metadata: {
      fileType: file.fileType,
      storageProvider: file.storageProvider,
      storageBucket: file.storageBucket,
      expiresAt: signed.expiresAt,
    },
  });
  return {
    fileId: file.id,
    signedUrl: signed.signedUrl,
    expiresAt: signed.expiresAt,
  };
}

export async function deleteFile(input: {
  companyId: string;
  userId: string;
  fileId: string;
  request?: Request;
}) {
  const file = await getFileById(input);
  if (!file) return null;
  const deleted = await uploadedFileRepository.update(file.id, {
    status: "deleted",
    deletedAt: new Date().toISOString(),
  });
  await activeObjectProvider()
    .deleteObject({
      bucket: file.storageBucket,
      key: file.storageKey,
    })
    .catch((error) => {
      logInternalError(error, {
        area: "storage_service",
        action: "delete_object_failed",
        storageProvider: file.storageProvider,
        storageBucket: file.storageBucket,
        fileType: file.fileType,
      });
    });
  logUploadEvent({
    request: input.request,
    actorId: input.userId,
    actorType: "customer",
    companyId: input.companyId,
    action: "file_deleted",
    entityId: file.id,
    metadata: {
      fileType: file.fileType,
      storageProvider: file.storageProvider,
      storageBucket: file.storageBucket,
    },
  });
  return deleted;
}

export async function fileExists(input: { companyId: string; fileId: string }) {
  const file = await getFileById(input);
  if (!file || file.status === "deleted" || file.status === "rejected") return false;
  return activeObjectProvider().fileExists({
    bucket: file.storageBucket,
    key: file.storageKey,
  });
}

export function toPublicUploadedFile(file: UploadedFile) {
  return {
    id: file.id,
    companyId: file.companyId,
    fileType: file.fileType,
    originalFilename: file.originalFilename,
    safeFilename: file.safeFilename,
    mimeType: file.mimeType,
    extension: file.extension,
    sizeBytes: file.sizeBytes,
    status: file.status,
    signedUrlExpiresAt: file.signedUrlExpiresAt,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
}

export async function markFileAsUsed(input: {
  companyId: string;
  fileId: string;
  request?: Request;
}) {
  const file = await getFileById(input);
  if (!file || file.status === "deleted" || file.status === "rejected") {
    return null;
  }
  return uploadedFileRepository.setStatus(file.id, "used");
}

export async function markFileAsRejected(input: {
  companyId: string;
  fileId: string;
}) {
  const file = await getFileById(input);
  if (!file) return null;
  return uploadedFileRepository.setStatus(file.id, "rejected");
}

export const storageService = {
  validateUploadRequest,
  uploadFile,
  getFileById,
  getFilesByCompany,
  getSignedFileUrl,
  deleteFile,
  markFileAsUsed,
  markFileAsRejected,
  fileExists,
  toPublicUploadedFile,
  createStorageKey,
  getUploadBucketForFileType,
};
