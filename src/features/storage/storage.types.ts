export const STORAGE_FILE_TYPES = [
  "company_logo",
  "embroidery_logo",
  "artwork",
  "quotation_attachment",
  "invoice_document",
  "purchase_order_document",
  "3d_snapshot",
  "product_glb_admin_future",
] as const;

export type StorageFileType = (typeof STORAGE_FILE_TYPES)[number];

export const STORAGE_FILE_STATUSES = [
  "pending",
  "uploaded",
  "validated",
  "rejected",
  "deleted",
  "used",
] as const;

export type StorageFileStatus = (typeof STORAGE_FILE_STATUSES)[number];

export type StorageProvider = "mock" | "supabase" | "s3";

export type StorageBucketPurpose = "logos" | "artwork" | "documents" | "3d";

export interface StorageRuntimeConfig {
  requestedProvider: StorageProvider;
  provider: StorageProvider;
  buckets: Record<StorageBucketPurpose, string>;
  signedUrlExpiresSeconds: number;
  maxUploadMb: {
    logo: number;
    document: number;
    glb: number;
  };
  supabaseConfigured: boolean;
}

export interface UploadedFile {
  id: string;
  companyId: string;
  userId: string;
  fileType: StorageFileType;
  originalFilename: string;
  safeFilename: string;
  storageProvider: StorageProvider;
  storageBucket: string;
  storageKey: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  status: StorageFileStatus;
  publicUrl: string | null;
  signedUrlExpiresAt: string | null;
  metadata: Record<string, unknown>;
  checksum: string | null;
  scanStatus: "pending" | "clean" | "flagged" | "skipped";
  sanitizedStatus: "pending" | "sanitized" | "not_required" | "required";
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadedFileListFilter {
  fileType?: StorageFileType;
  status?: StorageFileStatus;
}

export interface UploadFileInput {
  companyId: string;
  userId: string;
  fileType: StorageFileType;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  data: Uint8Array;
  metadata?: Record<string, unknown>;
  request?: Request;
}

export interface UploadObjectInput {
  bucket: string;
  key: string;
  mimeType: string;
  data: Uint8Array;
  metadata?: Record<string, unknown>;
  upsert?: boolean;
}

export interface StorageObjectProvider {
  name: StorageProvider;
  uploadObject(input: UploadObjectInput): Promise<{ publicUrl: string | null }>;
  getSignedUrl(input: {
    bucket: string;
    key: string;
    mimeType: string;
    expiresInSeconds: number;
  }): Promise<{ signedUrl: string; expiresAt: string }>;
  deleteObject(input: { bucket: string; key: string }): Promise<void>;
  fileExists(input: { bucket: string; key: string }): Promise<boolean>;
  getFileMetadata(input: {
    bucket: string;
    key: string;
  }): Promise<{ exists: boolean; sizeBytes: number | null; contentType: string | null }>;
}

export interface SignedFileUrl {
  fileId: string;
  signedUrl: string;
  expiresAt: string;
}
