import "server-only";

import type {
  QuotationEventRecord,
  QuotationRequestRecord,
  QuotationStatus,
} from "@/features/quotation/quotation.types";
import {
  calculateQuotationPricing,
  normalizeQuotationRecord,
} from "@/features/quotation/quotation.utils";
import type { QuotationRepository } from "../repository.types";

type QuotationRepositoryGlobal = typeof globalThis & {
  __ofissioQuotationRequests?: Map<string, QuotationRequestRecord>;
  __ofissioQuotationEvents?: Map<string, QuotationEventRecord[]>;
};

const quotationGlobal = globalThis as QuotationRepositoryGlobal;
const quotationRequests =
  quotationGlobal.__ofissioQuotationRequests ??
  (quotationGlobal.__ofissioQuotationRequests = new Map<string, QuotationRequestRecord>());
const quotationEvents =
  quotationGlobal.__ofissioQuotationEvents ??
  (quotationGlobal.__ofissioQuotationEvents = new Map<string, QuotationEventRecord[]>());

export const mockQuotationRepository: QuotationRepository = {
  async save(record) {
    const normalized = normalizeQuotationRecord(record);
    quotationRequests.set(record.id, normalized);
    return normalized;
  },

  async update(id, patch) {
    const current = quotationRequests.get(id);
    if (!current) return null;
    const next = normalizeQuotationRecord({
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
    quotationRequests.set(id, next);
    return next;
  },

  async getById(id) {
    const quotation = quotationRequests.get(id);
    return quotation ? normalizeQuotationRecord(quotation) : null;
  },

  async getByNumber(quotationNumber) {
    const quotation =
      [...quotationRequests.values()].find(
        (item) => item.quotationNumber === quotationNumber,
      ) ?? null;
    return quotation ? normalizeQuotationRecord(quotation) : null;
  },

  async listByCompany(companyId) {
    return [...quotationRequests.values()]
      .filter((quotation) => quotation.companyId === companyId)
      .map(normalizeQuotationRecord)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  },

  async listAll() {
    return [...quotationRequests.values()].map(normalizeQuotationRecord).sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  },

  async updateStatus(id, status, patch = {}) {
    return this.update(id, { ...patch, status });
  },

  async updatePricing(id, pricing) {
    const current = await this.getById(id);
    if (!current) return null;
    const calculated = calculateQuotationPricing(current, pricing);
    return this.update(id, {
      items: calculated.items,
      subtotal: calculated.subtotal,
      discountTotal: calculated.discountTotal,
      taxEnabled: calculated.taxEnabled,
      taxRate: calculated.taxRate,
      taxLabel: calculated.taxLabel,
      taxTotal: calculated.taxTotal,
      shippingEstimate: calculated.shippingEstimate,
      grandTotal: calculated.grandTotal,
      customerMessage: calculated.customerMessage,
      salesNotes: calculated.salesNotes,
      validUntil: calculated.validUntil,
      salesEmail: calculated.salesEmail,
    });
  },

  async addInternalNote(id, note) {
    const current = await this.getById(id);
    if (!current) return null;
    return this.update(id, {
      internalNotes: [...current.internalNotes, note],
    });
  },

  async addEvent(event) {
    const current = quotationEvents.get(event.quotationId) ?? [];
    quotationEvents.set(event.quotationId, [...current, event]);
    return event;
  },

  async getEvents(quotationId) {
    return [...(quotationEvents.get(quotationId) ?? [])].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  },

  async accept(id) {
    return this.updateStatus?.(id, "accepted", {
      acceptedAt: new Date().toISOString(),
      rejectedAt: null,
    }) ?? null;
  },

  async reject(id) {
    return this.updateStatus?.(id, "rejected", {
      rejectedAt: new Date().toISOString(),
    }) ?? null;
  },

  async markConverted(id, orderId) {
    return this.updateStatus?.(id, "converted_to_order", {
      convertedOrderId: orderId,
    }) ?? null;
  },
};
