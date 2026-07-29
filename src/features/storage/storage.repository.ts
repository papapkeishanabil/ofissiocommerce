import "server-only";

import type {
  StorageFileStatus,
  UploadedFile,
  UploadedFileListFilter,
} from "./storage.types";

type StorageRepositoryGlobal = typeof globalThis & {
  __ofissioUploadedFiles?: Map<string, UploadedFile>;
};

const storageGlobal = globalThis as StorageRepositoryGlobal;
const uploadedFiles =
  storageGlobal.__ofissioUploadedFiles ??
  (storageGlobal.__ofissioUploadedFiles = new Map<string, UploadedFile>());

export const uploadedFileRepository = {
  save(file: UploadedFile) {
    uploadedFiles.set(file.id, file);
    return file;
  },

  getFileById(input: { companyId: string; fileId: string }) {
    const file = uploadedFiles.get(input.fileId);
    if (!file || file.companyId !== input.companyId) return null;
    return file;
  },

  listFilesByCompany(companyId: string, filter: UploadedFileListFilter = {}) {
    return [...uploadedFiles.values()]
      .filter((file) => file.companyId === companyId)
      .filter((file) => (filter.fileType ? file.fileType === filter.fileType : true))
      .filter((file) => (filter.status ? file.status === filter.status : true))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  },

  update(fileId: string, patch: Partial<UploadedFile>) {
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

  setStatus(fileId: string, status: StorageFileStatus) {
    return this.update(fileId, { status });
  },
};
