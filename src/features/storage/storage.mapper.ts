import { extname } from "node:path";

import type {
  StorageBucketPurpose,
  StorageFileType,
  StorageRuntimeConfig,
} from "./storage.types";

export interface StorageFileRule {
  bucketPurpose: StorageBucketPurpose;
  extensions: string[];
  mimeTypes: string[];
  maxBytes: number;
  requiresSanitization?: boolean;
}

export function extensionFromFilename(filename: string) {
  return extname(filename).replace(/^\./, "").toLowerCase();
}

export function getUploadBucketForFileType(
  fileType: StorageFileType,
): StorageBucketPurpose {
  switch (fileType) {
    case "company_logo":
    case "embroidery_logo":
      return "logos";
    case "artwork":
    case "3d_snapshot":
      return "artwork";
    case "quotation_attachment":
    case "invoice_document":
    case "purchase_order_document":
      return "documents";
    case "product_glb_admin_future":
      return "3d";
  }
}

export function getStorageRuleForFileType(
  fileType: StorageFileType,
  config: StorageRuntimeConfig,
): StorageFileRule {
  const imageExtensions = [".png", ".jpg", ".jpeg", ".svg"];
  const imageMimeTypes = ["image/png", "image/jpeg", "image/svg+xml"];
  const documentExtensions = [".pdf", ".xlsx", ".png", ".jpg", ".jpeg"];
  const documentMimeTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/png",
    "image/jpeg",
  ];

  switch (fileType) {
    case "company_logo":
    case "embroidery_logo":
      return {
        bucketPurpose: "logos",
        extensions: imageExtensions,
        mimeTypes: imageMimeTypes,
        maxBytes: config.maxUploadMb.logo * 1024 * 1024,
        requiresSanitization: true,
      };
    case "artwork":
      return {
        bucketPurpose: "artwork",
        extensions: [...imageExtensions, ".pdf"],
        mimeTypes: [...imageMimeTypes, "application/pdf"],
        maxBytes: config.maxUploadMb.document * 1024 * 1024,
        requiresSanitization: true,
      };
    case "quotation_attachment":
    case "invoice_document":
    case "purchase_order_document":
      return {
        bucketPurpose: "documents",
        extensions: documentExtensions,
        mimeTypes: documentMimeTypes,
        maxBytes: config.maxUploadMb.document * 1024 * 1024,
      };
    case "3d_snapshot":
      return {
        bucketPurpose: "artwork",
        extensions: [".png", ".jpg", ".jpeg"],
        mimeTypes: ["image/png", "image/jpeg"],
        maxBytes: config.maxUploadMb.logo * 1024 * 1024,
      };
    case "product_glb_admin_future":
      return {
        bucketPurpose: "3d",
        extensions: [".glb"],
        mimeTypes: ["model/gltf-binary", "application/octet-stream"],
        maxBytes: config.maxUploadMb.glb * 1024 * 1024,
      };
  }
}
