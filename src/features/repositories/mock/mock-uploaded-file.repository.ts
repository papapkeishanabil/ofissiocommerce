import "server-only";

import type { UploadedFile, UploadedFileListFilter, StorageFileStatus } from "@/features/storage/storage.types";
import type { UploadedFileRepository } from "../repository.types";

type StorageRepositoryGlobal = typeof globalThis & {
  __ofissioUploadedFiles?: Map<string, UploadedFile>;
};

const storageGlobal = globalThis as StorageRepositoryGlobal;
const uploadedFiles =
  storageGlobal.__ofissioUploadedFiles ??
  (storageGlobal.__ofissioUploadedFiles = new Map<string, UploadedFile>());

export const mockUploadedFileRepository: UploadedFileRepository = {
  async save(file) {
    uploadedFiles.set(file.id, file);
    return file;
  },

  async getFileById(input) {
    const file = uploadedFiles.get(input.fileId);
    if (!file || file.companyId !== input.companyId) return null;
    return file;
  },

  async listFilesByCompany(companyId, filter: UploadedFileListFilter = {}) {
    return [...uploadedFiles.values()]
      .filter((file) => file.companyId === companyId)
      .filter((file) => (filter.fileType ? file.fileType === filter.fileType : true))
      .filter((file) => (filter.status ? file.status === filter.status : true))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  },

  async listAll(filter: UploadedFileListFilter = {}) {
    return [...uploadedFiles.values()]
      .filter((file) => (filter.fileType ? file.fileType === filter.fileType : true))
      .filter((file) => (filter.status ? file.status === filter.status : true))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  },

  async update(fileId, patch) {
    const current = uploadedFiles.get(fileId);
    if (!current) return null;
    const next: UploadedFile = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    uploadedFiles.set(fileId, next);
    return next;
  },

  async setStatus(fileId, status: StorageFileStatus) {
    return this.update(fileId, { status });
  },
};
