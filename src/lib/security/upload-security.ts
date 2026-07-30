import "server-only";

import { randomUUID } from "node:crypto";
import { extname } from "node:path";

import { logUploadEvent } from "./audit-log";

export type AllowedUploadKind =
  | "logo"
  | "document"
  | "spreadsheet"
  | "model3d"
  | "custom";

const UPLOAD_RULES: Record<
  AllowedUploadKind,
  {
    extensions: string[];
    mimeTypes: string[];
    maxBytes: number;
  }
> = {
  logo: {
    extensions: [".png", ".jpg", ".jpeg", ".svg"],
    mimeTypes: ["image/png", "image/jpeg", "image/svg+xml"],
    maxBytes: 5 * 1024 * 1024,
  },
  document: {
    extensions: [".pdf"],
    mimeTypes: ["application/pdf"],
    maxBytes: 10 * 1024 * 1024,
  },
  spreadsheet: {
    extensions: [".xlsx"],
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream",
    ],
    maxBytes: 10 * 1024 * 1024,
  },
  model3d: {
    extensions: [".glb"],
    mimeTypes: ["model/gltf-binary", "application/octet-stream"],
    maxBytes: 50 * 1024 * 1024,
  },
  custom: {
    extensions: [],
    mimeTypes: [],
    maxBytes: 0,
  },
};

export function sanitizeFilename(filename: string) {
  const cleaned = filename
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  return cleaned || "upload";
}

function safeStorageSegment(value: string) {
  return sanitizeFilename(value).replace(/\./g, "-") || "unscoped";
}

export function generateSafeStorageKey(input: {
  companyId: string;
  kind: AllowedUploadKind;
  filename: string;
  folder?: string;
}) {
  const ext = extname(sanitizeFilename(input.filename)).toLowerCase();
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return [
    safeStorageSegment(input.companyId),
    safeStorageSegment(input.folder ?? input.kind),
    year,
    month,
    `${randomUUID()}${ext}`,
  ].join("/");
}

export function validateExtension(input: {
  filename: string;
  allowedExtensions: string[];
}) {
  const sanitized = sanitizeFilename(input.filename);
  const ext = extname(sanitized).toLowerCase();
  return {
    ok: input.allowedExtensions.includes(ext),
    extension: ext,
    sanitizedFilename: sanitized,
  };
}

export function validateMimeType(input: {
  mimeType: string;
  allowedMimeTypes: string[];
}) {
  return input.allowedMimeTypes.includes(input.mimeType);
}

export function validateFileSize(input: {
  sizeBytes: number;
  maxBytes: number;
}) {
  return input.sizeBytes > 0 && input.sizeBytes <= input.maxBytes;
}

export function validateUploadFile(input: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: AllowedUploadKind;
  companyId?: string | null;
  request?: Request;
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
  maxBytes?: number;
  folder?: string;
}) {
  const rules = UPLOAD_RULES[input.kind];
  const allowedExtensions = input.allowedExtensions ?? rules.extensions;
  const allowedMimeTypes = input.allowedMimeTypes ?? rules.mimeTypes;
  const maxBytes = input.maxBytes ?? rules.maxBytes;
  const sanitized = sanitizeFilename(input.fileName);
  const ext = extname(sanitized).toLowerCase();
  const validExt = validateExtension({
    filename: sanitized,
    allowedExtensions,
  }).ok;
  const validMime = validateMimeType({
    mimeType: input.mimeType,
    allowedMimeTypes,
  });
  const validSize = validateFileSize({
    sizeBytes: input.sizeBytes,
    maxBytes,
  });
  const ok = validExt && validMime && validSize;

  if (!ok) {
    logUploadEvent({
      request: input.request,
      companyId: input.companyId ?? null,
      action: "upload_validation_failed",
      entityId: null,
      metadata: {
        kind: input.kind,
        extension: ext,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
      },
    });
  }

  return {
    ok,
    reason: !validExt
      ? "Format file tidak diizinkan."
      : !validMime
        ? "MIME file tidak sesuai."
        : !validSize
          ? "Ukuran file melebihi batas."
          : null,
    sanitizedFilename: sanitized,
    storageKey: ok
      ? generateSafeStorageKey({
          companyId: input.companyId ?? "unscoped",
          kind: input.kind,
          filename: sanitized,
          folder: input.folder,
        })
      : null,
  };
}

export function isProbablyGlb(bytes: Uint8Array) {
  // GLB starts with ASCII "glTF" (0x67 0x6c 0x54 0x46).
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x67 &&
    bytes[1] === 0x6c &&
    bytes[2] === 0x54 &&
    bytes[3] === 0x46
  );
}

// TODO Phase production: add antivirus scanning.
// TODO Phase production: sanitize SVG before storage/render.
// TODO Phase production: use signed URLs and private object storage.
