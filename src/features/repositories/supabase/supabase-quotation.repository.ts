import "server-only";

import type { QuotationRepository } from "../repository.types";
import { SupabaseDatabaseError } from "@/features/database/database.errors";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import {
  quotationEventToRow,
  quotationItemToRow,
  quotationToRow,
  rowToQuotationEvent,
  rowToQuotation,
} from "./supabase-mappers";
import { calculateQuotationPricing, normalizeQuotationRecord } from "@/features/quotation/quotation.utils";

export const supabaseQuotationRepository: QuotationRepository = {
  async save(record) {
    const client = getRequiredClient();
    const normalized = normalizeQuotationRecord(record);
    const rows = await client.insert("quotations", quotationToRow(normalized));
    if (normalized.items.length > 0) {
      await client.insert(
        "quotation_items",
        normalized.items.map((item, index) =>
          quotationItemToRow({ quotationId: normalized.id, item, index }),
        ),
      );
    }
    return rowToQuotation(rows[0] ?? quotationToRow(normalized));
  },

  async update(id, patch) {
    const current = await this.getById(id);
    if (!current) return null;
    const next = normalizeQuotationRecord({
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
    const rows = await getRequiredClient().update(
      "quotations",
      quotationToRow(next),
      { id },
    );
    return rows[0] ? rowToQuotation(rows[0]) : next;
  },

  async getById(id) {
    const rows = await getRequiredClient().select("quotations", {
      filters: { id },
      limit: 1,
    });
    return rows[0] ? rowToQuotation(rows[0]) : null;
  },

  async getByNumber(quotationNumber) {
    const rows = await getRequiredClient().select("quotations", {
      filters: { quotation_number: quotationNumber },
      limit: 1,
    });
    return rows[0] ? rowToQuotation(rows[0]) : null;
  },

  async listByCompany(companyId) {
    const rows = await getRequiredClient().select("quotations", {
      filters: { company_id: companyId },
      order: "created_at.desc",
    });
    return rows.map(rowToQuotation);
  },

  async listAll() {
    const rows = await getRequiredClient().select("quotations", {
      order: "created_at.desc",
    });
    return rows.map(rowToQuotation);
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
    try {
      await getRequiredClient().insert("quotation_events", quotationEventToRow(event));
    } catch (error) {
      if (
        error instanceof SupabaseDatabaseError &&
        error.reason === "relation_does_not_exist"
      ) {
        return event;
      }
      throw error;
    }
    return event;
  },

  async getEvents(quotationId) {
    try {
      const rows = await getRequiredClient().select("quotation_events", {
        filters: { quotation_id: quotationId },
        order: "created_at.desc",
      });
      return rows.map(rowToQuotationEvent);
    } catch (error) {
      if (
        error instanceof SupabaseDatabaseError &&
        error.reason === "relation_does_not_exist"
      ) {
        return [];
      }
      throw error;
    }
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

function getRequiredClient() {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabase database belum dikonfigurasi.");
  return client;
}
