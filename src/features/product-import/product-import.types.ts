export type ImportSeverity = "INFO" | "WARNING" | "ERROR";
export type ImportMatchStatus = "MATCHED" | "MATCHED_WITH_WARNING" | "PHOTO_MISSING" | "PRODUCT_MISSING" | "DUPLICATE_IMAGE_FOLDER" | "INVALID_SKU";
export type ImportAssetType = "IMAGE" | "GLB" | "VIDEO" | "OTHER";

export interface ImportIssue { severity: ImportSeverity; code: string; message: string }
export interface WooImportAttribute { name: string; values: string[]; visible: boolean; global: boolean }
export interface WooCommerceImportProduct {
  sourceId: string; sourceType: string; sku: string | null; name: string;
  parentSku: string | null; parentId: string | null;
  productType: "simple" | "variable" | "variation" | "external" | "unknown";
  published: boolean; description: string; shortDescription: string;
  regularPrice: number | null; salePrice: number | null; categories: string[]; tags: string[];
  attributes: WooImportAttribute[]; imageUrls: string[]; rawRow: Record<string, string>;
  internalKey: string;
}
export interface WooImportIndex {
  rows: WooCommerceImportProduct[]; parents: WooCommerceImportProduct[];
  byId: Map<string, WooCommerceImportProduct>; bySku: Map<string, WooCommerceImportProduct>;
  variationsByParentId: Map<string, WooCommerceImportProduct[]>;
}
export interface PhotoManifestAsset { relativePath: string; name: string; extension: string; length: number | null; directory: string; type: ImportAssetType }
export interface PhotoFolder { path: string; folderName: string; baseSku: string; variantHint: string | null; assets: PhotoManifestAsset[] }
export interface ProductImportPreviewItem {
  key: string; sourceSku: string | null; normalizedSku: string; suggestedSku: string | null;
  product: WooCommerceImportProduct | null; variations: WooCommerceImportProduct[]; folders: PhotoFolder[];
  images: PhotoManifestAsset[]; glbAssets: PhotoManifestAsset[]; videoAssets: PhotoManifestAsset[];
  variantPhotos: Array<{ hint: string; matchedValue: string | null; count: number; exact: boolean }>;
  suggestedCover: string | null; photoSource: "NEW_LOCAL_PHOTOS" | "LEGACY_WOOCOMMERCE" | "NONE";
  status: ImportMatchStatus; issues: ImportIssue[]; isReadyForImport: boolean;
}
export interface ProductImportPreview {
  products: ProductImportPreviewItem[];
  unassignedAssets: PhotoManifestAsset[];
  warningBreakdown: Array<{ category: string; count: number }>;
  summary: {
    wooRows: number; parentProducts: number; simpleProducts: number; variableProducts: number; variations: number; externalProducts: number;
    photoFolders: number; basePhotoSkus: number; totalImageFiles: number; assignedImages: number; unassignedImages: number;
    localPhotoMatchedProducts: number; photoOnlyProducts: number; legacyPhotoOnlyProducts: number; noPhotoProducts: number;
    productsWithWarnings: number; warningEvents: number; productsWithErrors: number; errorEvents: number;
    matched: number; matchedWithWarnings: number; photoMissing: number; productMissing: number; duplicateFolders: number; errors: number; warnings: number;
  };
}

export type ZipVerificationStatus = "FOUND" | "MISSING_FROM_ZIP" | "SIZE_MISMATCH" | "UNEXPECTED_ZIP_FILE" | "IGNORED_NON_IMAGE";
export interface ZipVerificationItem { path: string; status: ZipVerificationStatus; manifestSize: number | null; zipSize: number | null; mimeType: string | null }
export interface ZipVerificationResult {
  items: ZipVerificationItem[];
  summary: { manifestImages: number; zipImages: number; matched: number; missing: number; unexpected: number; sizeMismatch: number; glbIgnored: number; videosIgnored: number };
}

export type ProductImportAction = "CREATE_DRAFT" | "SKIP_EXISTING" | "SKIP_NEEDS_PRODUCT_DATA" | "SKIP_UNSUPPORTED" | "BLOCKED";
export type ProductImportImageAction = "UPLOAD_NEW_TO_WORDPRESS" | "REUSE_EXISTING_WORDPRESS_MEDIA" | "COPY_LEGACY_TO_WORDPRESS" | "SKIP_EXISTING_PRODUCT" | "SKIP_NEEDS_PRODUCT_DATA" | "SKIP_UNSUPPORTED" | "NONE";
export interface ProductImportDecisions {
  skuNormalizations: Record<string, boolean>;
  variantMappings: Record<string, boolean>;
  coverOverrides?: Record<string, string>;
}
export interface ProductImportPlanItem {
  sourceId: string; sourceSku: string | null; targetSku: string | null;
  name: string; action: ProductImportAction; reason: string;
  photoSource: ProductImportPreviewItem["photoSource"];
  imageCount: number; variationCount: number; warnings: string[];
  productType?: WooCommerceImportProduct["productType"] | null;
  imageAction?: ProductImportImageAction;
  variationWithoutSkuCount?: number;
  coverFilename?: string | null;
  variantImages?: Array<{ hint: string; matchedValue: string | null; count: number }>;
  legacySourceImages?: Array<{ sourceUrl: string; normalizedFilename: string; sourceId: string }>;
}
export interface ProductImportPlan {
  batchId: string;
  products: ProductImportPlanItem[];
  summary: {
    productsAnalyzed: number; createDraft: number; skipExisting: number;
    skipNeedsProductData: number; skipUnsupported: number; blocked: number;
    variationsReady: number; localImages: number; legacyImages: number;
    unassignedSkipped: number; warnings: number; errors: number;
    sourceVariations?: number; variationsSkipped?: number; variationsBlocked?: number;
    variationsWithoutSourceSku?: number; variationsWithoutSkuPreserved?: number; variationsWithoutSkuBlocked?: number;
    localSourceImages?: number; localImagesSkipped?: number; localImagesBlocked?: number;
    localPhotoProducts?: number; photoOnlyImagesSkipped?: number;
    legacyPhotoProducts?: number; legacyCreateProducts?: number; legacySkippedProducts?: number;
    legacySourceImages?: number; legacyImagesReused?: number; legacyImagesCopyRequired?: number; legacyImagesSkipped?: number; legacyImagesBlocked?: number;
    imagesBlocked?: number;
  };
}
export interface ProductImportDryRunResult {
  batchId: string; status: "DRY_RUN_PASSED" | "FAILED";
  zip: ZipVerificationResult; plan: ProductImportPlan;
}

export type ProductImportBatchStatus = "PREVIEWED" | "DRY_RUN_PASSED" | "UPLOADING" | "IMPORTING" | "COMPLETED" | "COMPLETED_WITH_WARNINGS" | "FAILED" | "CANCELLED";
