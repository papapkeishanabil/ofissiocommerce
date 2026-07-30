import "server-only";

import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import {
  documentPatchToRow,
  documentToRow,
  rowToDocument,
} from "@/features/documents/document.mapper";
import type { DocumentRepository } from "../repository.types";

export const supabaseDocumentRepository: DocumentRepository = {
  async save(document) {
    const client = getRequiredClient();
    const rows = await client.insert("documents", documentToRow(document));
    return rowToDocument(rows[0] ?? documentToRow(document));
  },

  async update(id, patch) {
    const rows = await getRequiredClient().update(
      "documents",
      documentPatchToRow(patch),
      { id },
    );
    return rows[0] ? rowToDocument(rows[0]) : null;
  },

  async getById(input) {
    const filters: Record<string, string> = { id: input.documentId };
    if (input.companyId) filters.company_id = input.companyId;
    const rows = await getRequiredClient().select("documents", {
      filters,
      limit: 1,
    });
    return rows[0] ? rowToDocument(rows[0]) : null;
  },

  async listByCompany(companyId) {
    const rows = await getRequiredClient().select("documents", {
      filters: { company_id: companyId },
      order: "created_at.desc",
    });
    return rows.map(rowToDocument);
  },

  async listByEntity(input) {
    const filters: Record<string, string> = {
      entity_type: input.entityType,
      entity_id: input.entityId,
    };
    if (input.companyId) filters.company_id = input.companyId;
    if (input.documentType) filters.document_type = input.documentType;
    const rows = await getRequiredClient().select("documents", {
      filters,
      order: "created_at.desc",
    });
    return rows.map(rowToDocument);
  },

  async listAll() {
    const rows = await getRequiredClient().select("documents", {
      order: "created_at.desc",
    });
    return rows.map(rowToDocument);
  },
};

function getRequiredClient() {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabase database belum dikonfigurasi.");
  return client;
}
