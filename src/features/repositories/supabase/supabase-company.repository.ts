import "server-only";

import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import type { CompanyRepository } from "../repository.types";

export const supabaseCompanyRepository: CompanyRepository = {
  async getCompanyById(companyId) {
    const client = getSupabaseAdminClient();
    if (!client) return null;
    const rows = await client.select("companies", {
      filters: { id: companyId },
      limit: 1,
    });
    return rows[0] ?? null;
  },
};
