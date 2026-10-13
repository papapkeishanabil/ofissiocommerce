import "server-only";

import { createApiError } from "@/lib/security/safe-error-response";
import type { UploadedFile } from "./storage.types";

export const MAX_LOGO_PREVIEW_BYTES = 10 * 1024 * 1024;

export function assertLogoPreviewFile(file: UploadedFile | null, companyId: string) {
  if (!file || file.companyId !== companyId ||
      !["uploaded", "validated", "used"].includes(file.status) ||
      !["company_logo", "embroidery_logo"].includes(file.fileType) ||
      !["image/png", "image/jpeg", "image/svg+xml"].includes(file.mimeType) ||
      !Number.isSafeInteger(file.sizeBytes) || file.sizeBytes < 1 ||
      file.sizeBytes > MAX_LOGO_PREVIEW_BYTES) {
    throw createApiError("NOT_FOUND", "Logo tidak ditemukan.", 404);
  }
  return file;
}

/** Buffer only a validated, bounded image; never forward upstream headers. */
export async function readLogoPreview(upstream: Response, expectedBytes: number) {
  const length = upstream.headers.get("content-length");
  if (!upstream.ok || !upstream.body ||
      (length !== null && Number(length) !== expectedBytes)) {
    await upstream.body?.cancel();
    throw createApiError("PROVIDER_ERROR", "Gambar logo belum dapat dimuat.", 502);
  }
  const reader = upstream.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > expectedBytes || size > MAX_LOGO_PREVIEW_BYTES) {
        throw createApiError("PROVIDER_ERROR", "Gambar logo belum dapat dimuat.", 502);
      }
      chunks.push(value);
    }
    if (size !== expectedBytes) {
      throw createApiError("PROVIDER_ERROR", "Gambar logo belum dapat dimuat.", 502);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
