import "server-only";

import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import type { StorageFileStatus, UploadedFileListFilter } from "@/features/storage/storage.types";
import type { UploadedFileRepository } from "../repository.types";
import { rowToUploadedFile, uploadedFileToRow } from "./supabase-mappers";

export const supabaseUploadedFileRepository: UploadedFileRepository = {
  async save(file) {
    const client = getRequiredClient();
    const rows = await client.insert("uploaded_files", uploadedFileToRow(file));
    return rowToUploadedFile(rows[0] ?? uploadedFileToRow(file));
  },

  async getFileById(input) {
    const client = getRequiredClient();
    const rows = await client.select("uploaded_files", {
      filters: { id: input.fileId, company_id: input.companyId },
      limit: 1,
    });
    return rows[0] ? rowToUploadedFile(rows[0]) : null;
  },

  async listFilesByCompany(companyId, filter: UploadedFileListFilter = {}) {
    const filters: Record<string, string> = { company_id: companyId };
    if (filter.fileType) filters.file_type = filter.fileType;
    if (filter.status) filters.status = filter.status;
    const rows = await getRequiredClient().select("uploaded_files", {
      filters,
      order: "created_at.desc",
    });
    return rows.map(rowToUploadedFile);
  },

  async listAll(filter: UploadedFileListFilter = {}) {
    const filters: Record<string, string> = {};
    if (filter.fileType) filters.file_type = filter.fileType;
    if (filter.status) filters.status = filter.status;
    const rows = await getRequiredClient().select("uploaded_files", {
      filters,
      order: "created_at.desc",
    });
    return rows.map(rowToUploadedFile);
  },

  async update(fileId, patch) {
    const rows = await getRequiredClient().update(
      "uploaded_files",
      uploadedFilePatchToRow(patch),
      { id: fileId },
    );
    return rows[0] ? rowToUploadedFile(rows[0]) : null;
  },

  async setStatus(fileId, status: StorageFileStatus) {
    return this.update(fileId, { status });
  },
};

function uploadedFilePatchToRow(patch: Parameters<UploadedFileRepository["update"]>[1]) {
  const row: Record<string, unknown> = {};
  if (patch.companyId) row.company_id = patch.companyId;
  if (patch.userId) row.user_id = patch.userId;
  if (patch.fileType) row.file_type = patch.fileType;
  if (patch.originalFilename) row.original_filename = patch.originalFilename;
  if (patch.safeFilename) row.safe_filename = patch.safeFilename;
  if (patch.storageBucket) row.storage_bucket = patch.storageBucket;
  if (patch.storageKey) row.storage_key = patch.storageKey;
  if (patch.mimeType) row.mime_type = patch.mimeType;
  if (patch.extension) row.extension = patch.extension;
  if (patch.sizeBytes !== undefined) row.size_bytes = patch.sizeBytes;
  if (patch.status) row.status = patch.status;
  if (patch.publicUrl !== undefined) row.public_url = patch.publicUrl;
  if (patch.signedUrlExpiresAt !== undefined) {
    row.signed_url_expires_at = patch.signedUrlExpiresAt;
  }
  if (patch.metadata) row.metadata_json = patch.metadata;
  row.updated_at = new Date().toISOString();
  return row;
}

function getRequiredClient() {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabase database belum dikonfigurasi.");
  return client;
}
