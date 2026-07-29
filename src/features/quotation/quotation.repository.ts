import "server-only";

import type { QuotationRequestRecord } from "./quotation.types";

type QuotationRepositoryGlobal = typeof globalThis & {
  __ofissioQuotationRequests?: Map<string, QuotationRequestRecord>;
};

const quotationGlobal = globalThis as QuotationRepositoryGlobal;
const quotationRequests =
  quotationGlobal.__ofissioQuotationRequests ??
  (quotationGlobal.__ofissioQuotationRequests = new Map<string, QuotationRequestRecord>());

export const quotationRepository = {
  save(record: QuotationRequestRecord) {
    quotationRequests.set(record.id, record);
    return record;
  },

  update(id: string, patch: Partial<QuotationRequestRecord>) {
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

  getById(id: string) {
    return quotationRequests.get(id) ?? null;
  },

  listByCompany(companyId: string) {
    return [...quotationRequests.values()]
      .filter((quotation) => quotation.companyId === companyId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  },

  listAll() {
    return [...quotationRequests.values()].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  },
};
