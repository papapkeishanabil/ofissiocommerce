import "server-only";

import type { QuotationRequestRecord } from "@/features/quotation/quotation.types";
import type { QuotationRepository } from "../repository.types";

type QuotationRepositoryGlobal = typeof globalThis & {
  __ofissioQuotationRequests?: Map<string, QuotationRequestRecord>;
};

const quotationGlobal = globalThis as QuotationRepositoryGlobal;
const quotationRequests =
  quotationGlobal.__ofissioQuotationRequests ??
  (quotationGlobal.__ofissioQuotationRequests = new Map<string, QuotationRequestRecord>());

export const mockQuotationRepository: QuotationRepository = {
  async save(record) {
    quotationRequests.set(record.id, record);
    return record;
  },

  async update(id, patch) {
    const current = quotationRequests.get(id);
    if (!current) return null;
    const next: QuotationRequestRecord = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    quotationRequests.set(id, next);
    return next;
  },

  async getById(id) {
    return quotationRequests.get(id) ?? null;
  },

  async listByCompany(companyId) {
    return [...quotationRequests.values()]
      .filter((quotation) => quotation.companyId === companyId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  },

  async listAll() {
    return [...quotationRequests.values()].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  },
};
