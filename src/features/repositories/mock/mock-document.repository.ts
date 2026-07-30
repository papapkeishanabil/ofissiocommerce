import "server-only";

import type { DocumentRecord } from "@/features/documents/document.types";
import type { DocumentRepository } from "../repository.types";

type DocumentGlobal = typeof globalThis & {
  __ofissioRepositoryDocuments?: Map<string, DocumentRecord>;
};

const documentGlobal = globalThis as DocumentGlobal;
const documents =
  documentGlobal.__ofissioRepositoryDocuments ??
  (documentGlobal.__ofissioRepositoryDocuments = new Map<string, DocumentRecord>());

function sortByGeneratedAt(rows: DocumentRecord[]) {
  return rows.sort(
    (a, b) =>
      Date.parse(b.generatedAt ?? b.createdAt) -
      Date.parse(a.generatedAt ?? a.createdAt),
  );
}

export const mockDocumentRepository: DocumentRepository = {
  async save(document) {
    documents.set(document.id, document);
    return document;
  },

  async update(id, patch) {
    const current = documents.get(id);
    if (!current) return null;
    const next = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    documents.set(id, next);
    return next;
  },

  async getById(input) {
    const document = documents.get(input.documentId);
    if (!document) return null;
    if (input.companyId && document.companyId !== input.companyId) return null;
    return document;
  },

  async listByCompany(companyId) {
    return sortByGeneratedAt(
      [...documents.values()].filter(
        (document) => document.companyId === companyId && document.status !== "deleted",
      ),
    );
  },

  async listByEntity(input) {
    return sortByGeneratedAt(
      [...documents.values()].filter(
        (document) =>
          (!input.companyId || document.companyId === input.companyId) &&
          document.entityType === input.entityType &&
          document.entityId === input.entityId &&
          (!input.documentType || document.documentType === input.documentType) &&
          document.status !== "deleted",
      ),
    );
  },

  async listAll() {
    return sortByGeneratedAt([...documents.values()]);
  },
};
