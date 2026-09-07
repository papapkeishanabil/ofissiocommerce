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
import { sanitizeFilename, validateUploadFile } from "@/lib/security/upload-security";

export type SiteVideoScope = "hero" | "bordir";

const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "application/octet-stream"];
const VIDEO_EXTENSIONS = [".mp4", ".webm"];

export async function uploadSiteContentVideo(input: {
  file: File;
  scope: SiteVideoScope;
  actorId: string;
  request?: Request;
}) {
  const config = getStorageRuntimeConfig();
  if (config.provider !== "supabase") {
    throw createApiError("PROVIDER_UNAVAILABLE", "Supabase Storage video belum aktif.", 503);
  }

  const mimeType = input.file.type || "application/octet-stream";
  const validation = validateUploadFile({
    fileName: input.file.name,
    mimeType,
    sizeBytes: input.file.size,
    kind: "video",
    request: input.request,
    allowedExtensions: VIDEO_EXTENSIONS,
    allowedMimeTypes: VIDEO_MIME_TYPES,
    maxBytes: config.maxUploadMb.video * 1024 * 1024,
    folder: `site-content/${input.scope}`,
  });
  if (!validation.ok) {
    throw createApiError("VALIDATION_ERROR", validation.reason ?? "File video tidak valid.", 400);
  }

  const bytes = new Uint8Array(await input.file.arrayBuffer());
  const extension = input.file.name.toLowerCase().endsWith(".webm") ? ".webm" : ".mp4";
  const validSignature = extension === ".webm" ? isProbablyWebm(bytes) : isProbablyMp4(bytes);
  if (!validSignature) {
    throw createApiError("VALIDATION_ERROR", `Isi file bukan ${extension.slice(1).toUpperCase()} yang valid.`, 400);
  }

  const sanitizedBase = sanitizeFilename(input.file.name)
    .replace(/\.(mp4|webm)$/i, "")
    .slice(0, 100);
  const safeFilename = `${sanitizedBase || `${input.scope}-video`}${extension}`;
  const storageKey = `site-content/${input.scope}/${randomUUID()}-${safeFilename}`;
  await uploadManagedStorageObject({
    bucket: config.buckets.site_videos,
    key: storageKey,
    mimeType: extension === ".webm" ? "video/webm" : "video/mp4",
    data: bytes,
    upsert: false,
    metadata: { purpose: `${input.scope}-site-content-video`, filename: safeFilename },
  });

  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: "internal",
    action: "site_content_video_uploaded",
    entityType: "site_content",
    entityId: input.scope,
    metadata: { filename: safeFilename, sizeBytes: input.file.size, storageKey },
  });

  return {
    url: `/api/site-content/video/${storageKey}`,
    filename: safeFilename,
    sizeBytes: input.file.size,
    mimeType: extension === ".webm" ? "video/webm" : "video/mp4",
  };
}

export async function resolveSiteContentVideo(storagePath: string) {
  const storageKey = decodeURIComponent(storagePath);
  if (!isAllowedSiteVideoKey(storageKey)) {
    throw createApiError("NOT_FOUND", "Video tidak tersedia.", 404);
  }
  const bucket = getStorageRuntimeConfig().buckets.site_videos;
  const object = await getManagedStorageObjectMetadata({ bucket, key: storageKey });
  if (!object.exists) throw createApiError("NOT_FOUND", "Video tidak tersedia.", 404);
  return getManagedStorageObjectSignedUrl({
    bucket,
    key: storageKey,
    mimeType: object.contentType || videoMimeFromPath(storageKey),
  });
}

export function isAllowedSiteVideoKey(key: string) {
  return /^site-content\/(hero|bordir)\/[0-9a-f-]{36}-[a-z0-9._-]+\.(mp4|webm)$/i.test(key);
}

export function isProbablyMp4(bytes: Uint8Array) {
  return bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
}

export function isProbablyWebm(bytes: Uint8Array) {
  return bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
}

export function videoMimeFromPath(path: string) {
  return path.toLowerCase().endsWith(".webm") ? "video/webm" : "video/mp4";
}
