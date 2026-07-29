import type { StorageFileStatus, StorageFileType } from "@/features/storage/storage.types";

export interface CompanyLogoAsset {
  id: string;
  companyId: string;
  fileId: string;
  label: string;
  originalFilename: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  status: StorageFileStatus;
  fileType: StorageFileType;
  previewUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyLogoRegistration {
  id: string;
  companyId: string;
  fileId: string;
  label: string;
  status: "active" | "deleted";
  createdAt: string;
  updatedAt: string;
}
