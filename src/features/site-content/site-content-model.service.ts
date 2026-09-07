import "server-only";

import { randomUUID } from "node:crypto";

import { getStorageRuntimeConfig } from "@/features/storage/storage.config";
import {
  getManagedStorageObjectMetadata,
  getManagedStorageObjectSignedUrl,
  uploadManagedStorageObject,
} from "@/features/storage/storage.service";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createApiError } from "@/lib/security/safe-error-response";
import { isProbablyGlb, sanitizeFilename, validateUploadFile } from "@/lib/security/upload-security";

const GLB_MIME_TYPES = ["model/gltf-binary", "application/octet-stream"];
const HERO_MODEL_PREFIX = "site-content/hero/";

export async function uploadSiteContentModel(input: {
  file: File;
  actorId: string;
  request?: Request;
}) {
  const config = getStorageRuntimeConfig();
  if (config.provider !== "supabase") {
    throw createApiError("PROVIDER_UNAVAILABLE", "Supabase Storage model 3D belum aktif.", 503);
  }

  const mimeType = input.file.type || "application/octet-stream";
  const validation = validateUploadFile({
    fileName: input.file.name,
    mimeType,
    sizeBytes: input.file.size,
    kind: "model3d",
    request: input.request,
    allowedExtensions: [".glb"],
    allowedMimeTypes: GLB_MIME_TYPES,
    maxBytes: config.maxUploadMb.glb * 1024 * 1024,
    folder: "site-content/hero",
  });
  if (!validation.ok) {
    throw createApiError("VALIDATION_ERROR", validation.reason ?? "File GLB tidak valid.", 400);
  }

  const bytes = new Uint8Array(await input.file.arrayBuffer());
  if (!isProbablyGlb(bytes)) {
    throw createApiError("VALIDATION_ERROR", "Isi file bukan binary GLB yang valid.", 400);
  }

  const sanitizedBase = sanitizeFilename(input.file.name).replace(/\.glb$/i, "").slice(0, 100);
  const safeFilename = `${sanitizedBase || "hero-model"}.glb`;
  const storageKey = `${HERO_MODEL_PREFIX}${randomUUID()}-${safeFilename}`;
  const bucket = config.buckets["3d"];
  await uploadManagedStorageObject({
    bucket,
    key: storageKey,
    mimeType,
    data: bytes,
    upsert: false,
    metadata: { purpose: "hero-site-content", filename: safeFilename },
  });

  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: "internal",
    action: "site_content_glb_uploaded",
    entityType: "site_content",
    entityId: "hero",
    metadata: { filename: safeFilename, sizeBytes: input.file.size, storageKey },
  });

  return {
    url: `/api/site-content/model-3d/${storageKey}`,
    filename: safeFilename,
    sizeBytes: input.file.size,
  };
}

export async function resolveSiteContentModel(storagePath: string) {
  const storageKey = decodeURIComponent(storagePath);
  if (!isAllowedHeroModelKey(storageKey)) {
    throw createApiError("NOT_FOUND", "Model 3D Hero tidak tersedia.", 404);
  }
  const bucket = getStorageRuntimeConfig().buckets["3d"];
  const object = await getManagedStorageObjectMetadata({ bucket, key: storageKey });
  if (!object.exists) {
    throw createApiError("NOT_FOUND", "Model 3D Hero tidak tersedia.", 404);
  }
  return getManagedStorageObjectSignedUrl({
    bucket,
    key: storageKey,
    mimeType: object.contentType || "model/gltf-binary",
  });
}

export function isAllowedHeroModelKey(key: string) {
  return /^site-content\/hero\/[0-9a-f-]{36}-[a-z0-9._-]+\.glb$/i.test(key);
}
