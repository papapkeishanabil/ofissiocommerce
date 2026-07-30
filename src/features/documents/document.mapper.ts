import "server-only";

import type { DocumentRecord, DocumentStatus } from "./document.types";

type Row = Record<string, unknown>;

export function documentToRow(document: DocumentRecord): Row {
  return {
    id: document.id,
    company_id: document.companyId,
    user_id: document.userId,
    document_type: document.documentType,
    entity_type: document.entityType,
    entity_id: document.entityId,
    document_number: document.documentNumber,
    template_id: document.templateId,
    file_id: document.fileId,
    storage_bucket: document.storageBucket,
    storage_key: document.storageKey,
    filename: document.filename,
    mime_type: document.mimeType,
    size_bytes: document.sizeBytes,
    status: document.status,
    generated_at: document.generatedAt,
    metadata_json: document.metadata,
    created_at: document.createdAt,
    updated_at: document.updatedAt,
    deleted_at: document.deletedAt,
  };
}

export function documentPatchToRow(patch: Partial<DocumentRecord>): Row {
  const row: Row = {};
  if (patch.companyId !== undefined) row.company_id = patch.companyId;
  if (patch.userId !== undefined) row.user_id = patch.userId;
  if (patch.documentType !== undefined) row.document_type = patch.documentType;
  if (patch.entityType !== undefined) row.entity_type = patch.entityType;
  if (patch.entityId !== undefined) row.entity_id = patch.entityId;
  if (patch.documentNumber !== undefined) row.document_number = patch.documentNumber;
  if (patch.templateId !== undefined) row.template_id = patch.templateId;
  if (patch.fileId !== undefined) row.file_id = patch.fileId;
  if (patch.storageBucket !== undefined) row.storage_bucket = patch.storageBucket;
  if (patch.storageKey !== undefined) row.storage_key = patch.storageKey;
  if (patch.filename !== undefined) row.filename = patch.filename;
  if (patch.mimeType !== undefined) row.mime_type = patch.mimeType;
  if (patch.sizeBytes !== undefined) row.size_bytes = patch.sizeBytes;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.generatedAt !== undefined) row.generated_at = patch.generatedAt;
  if (patch.metadata !== undefined) row.metadata_json = patch.metadata;
  if (patch.deletedAt !== undefined) row.deleted_at = patch.deletedAt;
  row.updated_at = new Date().toISOString();
  return row;
}

export function rowToDocument(row: Row): DocumentRecord {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    userId: row.user_id ? String(row.user_id) : null,
    documentType: row.document_type as DocumentRecord["documentType"],
    entityType: row.entity_type as DocumentRecord["entityType"],
    entityId: String(row.entity_id),
    documentNumber: String(row.document_number),
    templateId: row.template_id as DocumentRecord["templateId"],
    fileId: String(row.file_id),
    storageBucket: String(row.storage_bucket),
    storageKey: String(row.storage_key),
    filename: String(row.filename),
    mimeType: "application/pdf",
    sizeBytes: Number(row.size_bytes ?? 0),
    status: (row.status as DocumentStatus) ?? "generated",
    generatedAt: row.generated_at ? String(row.generated_at) : null,
    metadata:
      row.metadata_json && typeof row.metadata_json === "object"
        ? (row.metadata_json as Record<string, unknown>)
        : {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  };
}
