import "server-only";

import { getStorageRuntimeConfig } from "@/features/storage/storage.config";
import {
  deleteManagedStorageObject,
  getManagedStorageObjectMetadata,
  getManagedStorageObjectSignedUrl,
  uploadManagedStorageObject,
} from "@/features/storage/storage.service";
import { logAuditEvent } from "@/lib/security/audit-log";
import { isProbablyGlb, sanitizeFilename, validateUploadFile } from "@/lib/security/upload-security";
import { createApiError } from "@/lib/security/safe-error-response";

import { getMetaString } from "./woocommerce-product-meta";
import { getProductReadiness } from "./woocommerce-product-readiness";
import { updateAdminWooCommerceProduct3DMeta } from "./woocommerce-product-admin.service";
import { woocommerceClient } from "./woocommerce.client";

const GLB_MIME_TYPES = ["model/gltf-binary", "application/octet-stream"];

export async function uploadAdminProductGlb(input: {
  productId: number;
  file: File;
  version: string;
  actorId: string;
  request?: Request;
}) {
  const product = await woocommerceClient.getProductById(input.productId);
  const sku = product.sku?.trim();
  if (!sku) {
    throw createApiError("VALIDATION_ERROR", "Isi SKU sebelum mengunggah GLB.", 400);
  }

  const config = getStorageRuntimeConfig();
  if (config.provider !== "supabase") {
    throw createApiError(
      "PROVIDER_UNAVAILABLE",
      "Supabase Storage GLB belum aktif.",
      503,
    );
  }
  const validation = validateUploadFile({
    fileName: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    sizeBytes: input.file.size,
    kind: "model3d",
    request: input.request,
    allowedExtensions: [".glb"],
    allowedMimeTypes: GLB_MIME_TYPES,
    maxBytes: config.maxUploadMb.glb * 1024 * 1024,
  });
  if (!validation.ok) {
    throw createApiError("VALIDATION_ERROR", validation.reason ?? "File GLB tidak valid.", 400);
  }

  const bytes = new Uint8Array(await input.file.arrayBuffer());
  if (!isProbablyGlb(bytes)) {
    throw createApiError("VALIDATION_ERROR", "Isi file bukan binary GLB yang valid.", 400);
  }

  const safeFilename = sanitizeFilename(input.file.name);
  const safeSku = safeSegment(sku);
  const safeVersion = safeSegment(input.version || "v1");
  const storageKey = `products/${safeSku}/${safeVersion}/${safeFilename}`;
  const bucket = config.buckets["3d"];
  const modelId = `${safeSku}-${safeVersion}`;
  const resolverUrl = `/api/products/woocommerce/${input.productId}/3d-model/signed-url`;
  const existingBeforeUpload = await getManagedStorageObjectMetadata({
    bucket,
    key: storageKey,
  }).catch(() => ({ exists: false, sizeBytes: null, contentType: null }));

  try {
    await uploadManagedStorageObject({
      bucket,
      key: storageKey,
      mimeType: input.file.type || "application/octet-stream",
      data: bytes,
      upsert: true,
      metadata: {
        productId: input.productId,
        sku,
        version: safeVersion,
        filename: safeFilename,
      },
    });
    try {
      const detail = await updateAdminWooCommerceProduct3DMeta({
        id: input.productId,
        actorId: input.actorId,
        request: input.request,
        values: {
          has_3d_model: true,
          model_3d_source: "supabase",
          model_3d_storage_bucket: bucket,
          model_3d_storage_key: storageKey,
          model_3d_id: modelId,
          model_3d_version: safeVersion,
          model_3d_filename: safeFilename,
          model_3d_url: resolverUrl,
        },
      });
      logProductGlbAudit("product_glb_uploaded", input, {
        filename: safeFilename,
        version: safeVersion,
        sizeBytes: input.file.size,
      });
      return {
        detail,
        upload: {
          filename: safeFilename,
          version: safeVersion,
          modelId,
          sizeBytes: input.file.size,
          uploadedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (!existingBeforeUpload.exists) {
        await deleteManagedStorageObject({ bucket, key: storageKey }).catch(() => undefined);
      }
      throw error;
    }
  } catch (error) {
    logProductGlbAudit("product_glb_upload_failed", input, {
      filename: safeFilename,
      version: safeVersion,
      reason: "storage_or_metadata_error",
    });
    throw error;
  }
}

export async function getAdminProductGlbStatus(productId: number) {
  const product = await woocommerceClient.getProductById(productId);
  const meta = product.meta_data ?? [];
  const bucket = getMetaString(meta, "model_3d_storage_bucket");
  const key = getMetaString(meta, "model_3d_storage_key");
  const configuredBucket = getStorageRuntimeConfig().buckets["3d"];
  const safeReference = isAllowedProductObject(bucket, key, configuredBucket);
  const object = safeReference
    ? await getManagedStorageObjectMetadata({ bucket, key })
    : { exists: false, sizeBytes: null, contentType: null };
  return {
    configured: Boolean(bucket && key),
    exists: object.exists,
    filename: getMetaString(meta, "model_3d_filename"),
    version: getMetaString(meta, "model_3d_version"),
    source: getMetaString(meta, "model_3d_source"),
    sizeBytes: object.sizeBytes,
    contentType: object.contentType,
    readiness: getProductReadiness(product),
  };
}

export async function resolvePublishedProductGlb(input: {
  productId: number;
  request?: Request;
}) {
  const product = await woocommerceClient.getProductById(input.productId);
  const readiness = getProductReadiness(product);
  if (product.status !== "publish" || !readiness.isVisibleInOfissio) {
    throw createApiError("NOT_FOUND", "Model 3D produk belum tersedia.", 404);
  }
  const meta = product.meta_data ?? [];
  const bucket = getMetaString(meta, "model_3d_storage_bucket");
  const key = getMetaString(meta, "model_3d_storage_key");
  const configuredBucket = getStorageRuntimeConfig().buckets["3d"];
  if (!isAllowedProductObject(bucket, key, configuredBucket)) {
    throw createApiError("NOT_FOUND", "Model 3D produk belum tersedia.", 404);
  }
  const object = await getManagedStorageObjectMetadata({ bucket, key });
  if (!object.exists) {
    throw createApiError("NOT_FOUND", "Model 3D produk belum tersedia.", 404);
  }
  const signed = await getManagedStorageObjectSignedUrl({
    bucket,
    key,
    mimeType: object.contentType || "model/gltf-binary",
  });
  logAuditEvent({
    request: input.request,
    action: "product_3d_signed_url_created",
    entityType: "product",
    entityId: String(input.productId),
    metadata: { expiresAt: signed.expiresAt },
  });
  return { url: signed.signedUrl, expiresAt: signed.expiresAt };
}

function isAllowedProductObject(bucket: string, key: string, configuredBucket: string) {
  return bucket === configuredBucket && /^products\/[a-z0-9._-]+\/[a-z0-9._-]+\/[a-z0-9._-]+\.glb$/i.test(key);
}

function safeSegment(value: string) {
  return sanitizeFilename(value).replace(/\./g, "-") || "unknown";
}

function logProductGlbAudit(
  action: string,
  input: { productId: number; actorId: string; request?: Request },
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
