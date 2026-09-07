// src/features/site-content/site-content-image.service.ts
// Upload gambar konten homepage (cth. foto tile industri §02) ke WordPress
// Media — media library yang sama dengan foto produk, dikembalikan sebagai URL
// publik yang langsung tersimpan di field `photo` site-content. Mengikuti pola
// uploadAdminProductImages, tanpa bagian yang terikat produk WooCommerce.

import "server-only";

import {
  PRODUCT_IMAGE_EXTENSIONS,
  PRODUCT_IMAGE_MIME_TYPES,
} from "@/features/products/woocommerce/woocommerce-product-image.validation";
import {
  getWordPressMediaRuntimeConfig,
  uploadProductImageToWordPress,
} from "@/features/products/woocommerce/wordpress-media-upload.service";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createApiError } from "@/lib/security/safe-error-response";
import { validateUploadFile } from "@/lib/security/upload-security";

interface SiteContentImageInput {
  file: File;
  actorId: string;
  request?: Request;
}

export async function uploadSiteContentImage(input: SiteContentImageInput) {
  const mediaConfig = getWordPressMediaRuntimeConfig();
  if (!mediaConfig.isConfigured) {
    throw createApiError(
      "PROVIDER_UNAVAILABLE",
      "WordPress Media belum dikonfigurasi.",
      503,
    );
  }

  const validation = validateUploadFile({
    fileName: input.file.name,
    mimeType: input.file.type,
    sizeBytes: input.file.size,
    kind: "custom",
    request: input.request,
    allowedExtensions: [...PRODUCT_IMAGE_EXTENSIONS],
    allowedMimeTypes: [...PRODUCT_IMAGE_MIME_TYPES],
    maxBytes: mediaConfig.maxUploadMb * 1024 * 1024,
    folder: "site-content",
  });
  if (!validation.ok || !validation.sanitizedFilename) {
    throw createApiError(
      "VALIDATION_ERROR",
      validation.reason ?? "Format foto tidak didukung.",
      400,
    );
  }

  // Hanya 12 byte pertama yang diperlukan untuk validasi format — hindari
  // salinan besar di memori sebelum upload dimulai (pola foto produk).
  const signature = new Uint8Array(await input.file.slice(0, 12).arrayBuffer());
  if (!hasValidImageSignature(signature, input.file.type)) {
    throw createApiError(
      "VALIDATION_ERROR",
      "Isi file tidak sesuai dengan format foto yang dipilih.",
      400,
    );
  }

  const base = filenameBase(validation.sanitizedFilename);
  try {
    const media = await uploadProductImageToWordPress({
      file: input.file,
      filename: validation.sanitizedFilename,
      mimeType: input.file.type,
      title: `Konten homepage — ${base}`,
      alt: base,
    });
    logAuditEvent({
      request: input.request,
      actorId: input.actorId,
      actorType: "internal",
      action: "site_content_image_uploaded",
      entityType: "site_content",
      entityId: null,
      metadata: {
        filename: validation.sanitizedFilename,
        mimeType: input.file.type,
        sizeBytes: input.file.size,
        wordpressMediaId: media.id,
      },
    });
    return { url: media.sourceUrl, mediaId: media.id };
  } catch (error) {
    if (error instanceof Error && isWordPressUnavailable(error)) {
      throw createApiError(
        "PROVIDER_UNAVAILABLE",
        "WordPress Media sedang tidak tersedia. Pastikan server WordPress aktif, lalu coba lagi.",
        503,
      );
    }
    throw error;
  }
}

/** Kegagalan jaringan ke host WordPress (koneksi ditolak/reset, DNS, timeout)
 *  bisa bermuatan pesan kosong dari ClientRequest — semuanya berarti media
 *  library tidak bisa dihubungi, bukan kesalahan pada file yang diunggah. */
function isWordPressUnavailable(error: Error) {
  if (error.message.startsWith("wordpress_media_")) return true;
  return (
    !error.message.trim() ||
    /ECONNREFUSED|ECONNRESET|ENOTFOUND|ETIMEDOUT|network_error|fetch failed/i.test(
      error.message,
    )
  );
}

function hasValidImageSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  if (mimeType === "image/webp") {
    return (
      bytes.length >= 12 &&
      readAscii(bytes, 0, 4) === "RIFF" &&
      readAscii(bytes, 8, 12) === "WEBP"
    );
  }
  return false;
}

function readAscii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end));
}

function filenameBase(filename: string) {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return base || "gambar homepage";
}
