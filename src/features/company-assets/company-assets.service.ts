import "server-only";

import { storageService } from "@/features/storage/storage.service";
import type { UploadedFile } from "@/features/storage/storage.types";

import { companyLogoRepository } from "./company-assets.repository";
import type { CompanyLogoAsset } from "./company-assets.types";

function defaultLabel(file: UploadedFile) {
  return file.metadata.label?.toString() || file.originalFilename;
}

async function toLogoAsset(input: {
  file: UploadedFile;
  label?: string;
}): Promise<CompanyLogoAsset> {
  const signed = await storageService
    .getSignedFileUrl({
      companyId: input.file.companyId,
      fileId: input.file.id,
    })
    .catch(() => null);
  return {
    id: input.file.id,
    companyId: input.file.companyId,
    fileId: input.file.id,
    label: input.label || defaultLabel(input.file),
    originalFilename: input.file.originalFilename,
    mimeType: input.file.mimeType,
    extension: input.file.extension,
    sizeBytes: input.file.sizeBytes,
    status: input.file.status,
    fileType: input.file.fileType,
    previewUrl: signed?.signedUrl ?? input.file.publicUrl,
    createdAt: input.file.createdAt,
    updatedAt: input.file.updatedAt,
  };
}

export async function listCompanyLogos(companyId: string) {
  const registrations = await companyLogoRepository.listByCompany(companyId);
  const registeredFileIds = new Set(registrations.map((logo) => logo.fileId));
  const registeredAssets = await Promise.all(
    registrations.map(async (logo) => {
      const file = await storageService.getFileById({ companyId, fileId: logo.fileId });
      if (!file || file.status === "deleted" || file.status === "rejected") {
        return null;
      }
      return toLogoAsset({ file, label: logo.label });
    }),
  );

  const looseLogoFiles = (await storageService
    .getFilesByCompany(companyId))
    .filter(
      (file) =>
        (file.fileType === "company_logo" || file.fileType === "embroidery_logo") &&
        !registeredFileIds.has(file.id),
    );
  const looseAssets = await Promise.all(
    looseLogoFiles.map((file) => toLogoAsset({ file })),
  );
  return [...registeredAssets.filter(Boolean), ...looseAssets] as CompanyLogoAsset[];
}

export async function createCompanyLogo(input: {
  companyId: string;
  fileId: string;
  label?: string;
}) {
  const file = await storageService.getFileById({
    companyId: input.companyId,
    fileId: input.fileId,
  });
  if (
    !file ||
    file.status === "deleted" ||
    file.status === "rejected" ||
    (file.fileType !== "company_logo" && file.fileType !== "embroidery_logo")
  ) {
    return null;
  }
  const logo = await companyLogoRepository.create({
    companyId: input.companyId,
    fileId: input.fileId,
    label: input.label || defaultLabel(file),
  });
  await storageService.markFileAsUsed({ companyId: input.companyId, fileId: file.id });
  return logo;
}

export async function deleteCompanyLogo(input: {
  companyId: string;
  userId: string;
  logoId: string;
  request?: Request;
}) {
  const registration = await companyLogoRepository.getById({
    companyId: input.companyId,
    logoId: input.logoId,
  });
  if (registration) {
    await companyLogoRepository.softDelete({
      companyId: input.companyId,
      logoId: input.logoId,
    });
    return storageService.deleteFile({
      companyId: input.companyId,
      userId: input.userId,
      fileId: registration.fileId,
      request: input.request,
    });
  }
  return storageService.deleteFile({
    companyId: input.companyId,
    userId: input.userId,
    fileId: input.logoId,
    request: input.request,
  });
}

export const companyAssetsService = {
  listCompanyLogos,
  createCompanyLogo,
  deleteCompanyLogo,
};
