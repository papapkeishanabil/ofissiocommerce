import "server-only";

import { logAuditEvent } from "@/lib/security/audit-log";
import { createApiError } from "@/lib/security/safe-error-response";
import {
  sanitizeFilename,
  validateUploadFile,
} from "@/lib/security/upload-security";

import type { AdminProductImage } from "./woocommerce-product-admin.types";
import type { WooCommerceImage } from "./woocommerce.types";
import {
  PRODUCT_IMAGE_EXTENSIONS,
  PRODUCT_IMAGE_MAX_COUNT,
  PRODUCT_IMAGE_MIME_TYPES,
  type AdminProductImagesPatch,
} from "./woocommerce-product-image.validation";
import { woocommerceClient } from "./woocommerce.client";
import {
  getWordPressMediaRuntimeConfig,
  uploadProductImageToWordPress,
} from "./wordpress-media-upload.service";

interface ProductImageActorInput {
  productId: number;
  actorId: string;
  request?: Request;
}

export async function listAdminProductImages(productId: number) {
  const product = await woocommerceClient.getProductById(productId);
  return normalizeImages(product.images ?? [], product.name);
}

export async function uploadAdminProductImages(
  input: ProductImageActorInput & { files: File[] },
) {
  const product = await woocommerceClient.getProductById(input.productId);
  const sku = product.sku?.trim();
  if (!sku) {
    throw createApiError(
      "VALIDATION_ERROR",
      "Isi SKU sebelum mengunggah foto produk.",
      400,
    );
  }
  if (input.files.length === 0) {
    throw createApiError("VALIDATION_ERROR", "Pilih foto produk.", 400);
  }

  const current = normalizeImages(product.images ?? [], product.name);
  if (current.length + input.files.length > PRODUCT_IMAGE_MAX_COUNT) {
    throw createApiError(
      "VALIDATION_ERROR",
      `Maksimal ${PRODUCT_IMAGE_MAX_COUNT} foto per produk.`,
      400,
    );
  }

  const mediaConfig = getWordPressMediaRuntimeConfig();
  const validatedFiles: Array<{ file: File; safeFilename: string }> = [];
  for (const file of input.files) {
    const validation = validateUploadFile({
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      kind: "custom",
      request: input.request,
      allowedExtensions: [...PRODUCT_IMAGE_EXTENSIONS],
      allowedMimeTypes: [...PRODUCT_IMAGE_MIME_TYPES],
      maxBytes: mediaConfig.maxUploadMb * 1024 * 1024,
      folder: "product-images",
    });
    if (!validation.ok) {
      logImageAudit("product_image_upload_failed", input, {
        filename: sanitizeFilename(file.name),
        reason: "validation_failed",
      });
      throw createApiError(
        "VALIDATION_ERROR",
        validation.reason ?? "Format foto produk tidak didukung.",
        400,
      );
    }
    // Only the first 12 bytes are required for format validation. Reading the
    // complete file here used to create another large in-memory copy before
    // the WordPress upload started.
    const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (!hasValidImageSignature(signature, file.type)) {
      logImageAudit("product_image_upload_failed", input, {
        filename: sanitizeFilename(file.name),
        reason: "invalid_file_signature",
      });
      throw createApiError(
        "VALIDATION_ERROR",
        "Isi file tidak sesuai dengan format foto yang dipilih.",
        400,
      );
    }
    validatedFiles.push({
      file,
      safeFilename: validation.sanitizedFilename,
    });
  }
  if (!mediaConfig.isConfigured) {
    throw createApiError(
      "PROVIDER_UNAVAILABLE",
      "WordPress Media belum dikonfigurasi.",
      503,
    );
  }

  const uploadedImages: AdminProductImage[] = [];
  try {
    const uploadResults = new Array<AdminProductImage>(validatedFiles.length);
    let nextUploadIndex = 0;
    const uploadWorker = async () => {
      while (nextUploadIndex < validatedFiles.length) {
        const index = nextUploadIndex;
        nextUploadIndex += 1;
        const validated = validatedFiles[index];
        if (!validated) return;
        const position = current.length + index;
        const title = `${sku} ${
          position === 0 ? "main image" : `gallery image ${position}`
        }`;
        const alt =
          position === 0
            ? stripHtml(product.name)
            : `${stripHtml(product.name)} foto ${position + 1}`;
        const media = await uploadProductImageToWordPress({
          file: validated.file,
          filename: validated.safeFilename,
          mimeType: validated.file.type,
          title,
          alt,
        });
        const image: AdminProductImage = {
          id: media.id,
          src: media.sourceUrl,
          name: media.title || title,
          alt: media.alt || alt,
        };
        uploadResults[index] = image;
        logImageAudit("product_image_uploaded", input, {
          filename: validated.safeFilename,
          mimeType: validated.file.type,
          sizeBytes: validated.file.size,
          wordpressMediaId: media.id,
        });
      }
    };

    // WordPress has no batch media endpoint. Two workers shorten multi-image
    // uploads substantially without overwhelming PHP image processing.
    const workerCount = Math.min(2, validatedFiles.length);
    await Promise.all(Array.from({ length: workerCount }, () => uploadWorker()));
    uploadedImages.push(...uploadResults);

    const nextImages = [...current, ...uploadedImages];
    const fallbackUsed = await updateWooProductImagesWithFallback(
      input.productId,
      nextImages,
      new Set(uploadedImages.flatMap((image) => (image.id ? [image.id] : []))),
    );
    logImageAudit("product_images_updated", input, {
      imageCount: nextImages.length,
      uploadedCount: uploadedImages.length,
      wordpressSourceFallback: fallbackUsed,
    });
    return {
      images: fallbackUsed
        ? await listAdminProductImages(input.productId)
        : nextImages,
      uploadedImages,
    };
  } catch (error) {
    logImageAudit("product_images_update_failed", input, {
      reason: "wordpress_or_woocommerce_error",
      uploadedMediaCount: uploadedImages.length,
    });
    if (error instanceof Error && error.message.startsWith("wordpress_media_")) {
      throw createApiError(
        "PROVIDER_UNAVAILABLE",
        "WordPress Media sedang tidak tersedia.",
        503,
      );
    }
    throw error;
  }
}

export async function updateAdminProductImages(
  input: ProductImageActorInput & { payload: AdminProductImagesPatch },
) {
  const product = await woocommerceClient.getProductById(input.productId);
  const current = normalizeImages(product.images ?? [], product.name);
  try {
    const next = input.payload.images.map((submitted) => {
      const matching = current.find(
        (image) =>
          (submitted.id != null && image.id === submitted.id) ||
          image.src === submitted.src,
      );
      if (!matching || matching.src !== submitted.src) {
        throw createApiError(
          "VALIDATION_ERROR",
          "Daftar foto berisi referensi yang tidak dikenal.",
          400,
        );
      }
      return {
        ...matching,
        name: submitted.name?.trim() || matching.name,
        alt: submitted.alt?.trim() || matching.alt,
      };
    });

    const currentOrder = current.map(imageKey);
    const nextOrder = next.map(imageKey);
    const removed = current.filter((image) => !nextOrder.includes(imageKey(image)));
    const primaryChanged = currentOrder[0] !== nextOrder[0];
    const reordered =
      currentOrder.filter((key) => nextOrder.includes(key)).join("|") !==
      nextOrder.filter((key) => currentOrder.includes(key)).join("|");

    await woocommerceClient.updateProduct(input.productId, {
      images: next.map(toWooWriteImage),
    });
    if (removed.length > 0) {
      logImageAudit("product_image_removed", input, {
        removedCount: removed.length,
      });
    }
    if (primaryChanged) {
      logImageAudit("product_primary_image_changed", input, {
        hasPrimaryImage: next.length > 0,
      });
    }
    if (reordered) {
      logImageAudit("product_images_reordered", input, {
        imageCount: next.length,
      });
    }
    logImageAudit("product_images_updated", input, {
      imageCount: next.length,
    });
    return {
      images: next,
    };
  } catch (error) {
    logImageAudit("product_images_update_failed", input, {
      reason: "validation_or_woocommerce_error",
    });
    throw error;
  }
}

function normalizeImages(images: WooCommerceImage[], productName: string) {
  return images
    .filter((image) => Boolean(image.src))
    .map(
      (image): AdminProductImage => ({
        id: Number.isInteger(image.id) && image.id > 0 ? image.id : null,
        src: image.src,
        name: image.name?.trim() || stripHtml(productName),
        alt: image.alt?.trim() || stripHtml(productName),
      }),
    );
}

function toWooWriteImage(image: AdminProductImage) {
  return {
    ...(image.id ? { id: image.id } : { src: image.src }),
    name: image.name,
    alt: image.alt,
  };
}

function imageKey(image: AdminProductImage) {
  return image.id ? `id:${image.id}` : `src:${image.src}`;
}

async function updateWooProductImagesWithFallback(
  productId: number,
  images: AdminProductImage[],
  newlyUploadedMediaIds: Set<number>,
) {
  try {
    await woocommerceClient.updateProduct(productId, {
      images: images.map(toWooWriteImage),
    });
    return false;
  } catch {
    await woocommerceClient.updateProduct(productId, {
      images: images.map((image) =>
        image.id && newlyUploadedMediaIds.has(image.id)
          ? { src: image.src, name: image.name, alt: image.alt }
          : toWooWriteImage(image),
      ),
    });
    return true;
  }
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

function stripHtml(value = "") {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function logImageAudit(
  action: string,
  input: ProductImageActorInput,
  metadata: Record<string, unknown>,
) {
  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: "internal",
    action,
    entityType: "product",
    entityId: String(input.productId),
    metadata,
  });
}
