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
/** Section yang boleh memiliki model 3D unggahan — folder Storage
 *  mengikuti target (pola yang sama seperti scope video). */
export type SiteModelTarget = "hero" | "produk";
const MODEL_TARGET_PREFIXES: Record<SiteModelTarget, string> = {
  hero: "site-content/hero/",
  produk: "site-content/produk/",
};

export async function uploadSiteContentModel(input: {
  file: File;
  actorId: string;
  request?: Request;
  target?: SiteModelTarget;
}) {
  const config = getStorageRuntimeConfig();
  if (config.provider !== "supabase") {
    throw createApiError("PROVIDER_UNAVAILABLE", "Supabase Storage model 3D belum aktif.", 503);
  }

  const target: SiteModelTarget = input.target ?? "hero";
  const prefix = MODEL_TARGET_PREFIXES[target];
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
    folder: prefix.replace(/\/$/, ""),
  });
  if (!validation.ok) {
    throw createApiError("VALIDATION_ERROR", validation.reason ?? "File GLB tidak valid.", 400);
  }

  const bytes = new Uint8Array(await input.file.arrayBuffer());
  if (!isProbablyGlb(bytes)) {
    throw createApiError("VALIDATION_ERROR", "Isi file bukan binary GLB yang valid.", 400);
  }

  const sanitizedBase = sanitizeFilename(input.file.name).replace(/\.glb$/i, "").slice(0, 100);
  const safeFilename = `${sanitizedBase || `${target}-model`}.glb`;
  const storageKey = `${prefix}${randomUUID()}-${safeFilename}`;
  const bucket = config.buckets["3d"];
  await uploadManagedStorageObject({
    bucket,
    key: storageKey,
    mimeType,
    data: bytes,
    upsert: false,
    metadata: { purpose: `${target}-site-content-model`, filename: safeFilename },
  });

  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: "internal",
    action: "site_content_glb_uploaded",
    entityType: "site_content",
    entityId: target,
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
  if (!isAllowedSiteContentModelKey(storageKey)) {
    throw createApiError("NOT_FOUND", "Model 3D tidak tersedia.", 404);
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

/** Allowlist key model unggahan: hanya folder section yang dikenal, nama
 *  file selalu "<uuid36>-<nama-sanitized>.glb" (uuid dibuat server, bukan
 *  client), sehingga path traversal maupun key lain tertolak. */
export function isAllowedSiteContentModelKey(key: string) {
  return /^site-content\/(hero|produk)\/[0-9a-f-]{36}-[a-z0-9._-]+\.glb$/i.test(key);
}
