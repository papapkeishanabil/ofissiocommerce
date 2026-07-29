import "server-only";

import type { QuotationRepository } from "../repository.types";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import {
  quotationItemToRow,
  quotationToRow,
  rowToQuotation,
} from "./supabase-mappers";

export const supabaseQuotationRepository: QuotationRepository = {
  async save(record) {
    const client = getRequiredClient();
    const rows = await client.insert("quotations", quotationToRow(record));
    if (record.items.length > 0) {
      await client.insert(
        "quotation_items",
        record.items.map((item, index) =>
          quotationItemToRow({ quotationId: record.id, item, index }),
        ),
      );
    }
    return rowToQuotation(rows[0] ?? quotationToRow(record));
  },

  async update(id, patch) {
    const current = await this.getById(id);
    if (!current) return null;
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
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
};

function getRequiredClient() {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabase database belum dikonfigurasi.");
  return client;
}
