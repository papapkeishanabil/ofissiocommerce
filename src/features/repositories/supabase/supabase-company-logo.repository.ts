import "server-only";

import { randomUUID } from "node:crypto";

import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import type { CompanyLogoRegistration } from "@/features/company-assets/company-assets.types";
import type { CompanyLogoRepository } from "../repository.types";
import { companyLogoToRow, rowToCompanyLogo } from "./supabase-mappers";

export const supabaseCompanyLogoRepository: CompanyLogoRepository = {
  async create(input) {
    const client = getRequiredClient();
    const existing = await client.select("company_logos", {
      filters: { company_id: input.companyId, file_id: input.fileId, status: "active" },
      limit: 1,
    });
    if (existing[0]) return rowToCompanyLogo(existing[0]);
    const now = new Date().toISOString();
    const logo: CompanyLogoRegistration = {
      id: `logo_${randomUUID()}`,
      companyId: input.companyId,
      fileId: input.fileId,
      label: input.label,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    const rows = await client.insert("company_logos", companyLogoToRow(logo));
    return rowToCompanyLogo(rows[0] ?? companyLogoToRow(logo));
  },

  async listByCompany(companyId) {
    const rows = await getRequiredClient().select("company_logos", {
      filters: { company_id: companyId, status: "active" },
      order: "created_at.desc",
    });
    return rows.map(rowToCompanyLogo);
  },

  async getById(input) {
    const rows = await getRequiredClient().select("company_logos", {
      filters: { id: input.logoId, company_id: input.companyId },
      limit: 1,
    });
    return rows[0] ? rowToCompanyLogo(rows[0]) : null;
  },

  async softDelete(input) {
    const rows = await getRequiredClient().update(
      "company_logos",
      { status: "deleted", updated_at: new Date().toISOString() },
      { id: input.logoId, company_id: input.companyId },
    );
    return rows[0] ? rowToCompanyLogo(rows[0]) : null;
  },
};

function getRequiredClient() {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabase database belum dikonfigurasi.");
  return client;
}
