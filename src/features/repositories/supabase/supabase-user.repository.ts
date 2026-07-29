import "server-only";

import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import type { UserCompanyRepository } from "../repository.types";

export const supabaseUserRepository: UserCompanyRepository = {
  async getCompanyUser(input) {
    const client = getSupabaseAdminClient();
    if (!client) return null;
    const rows = await client.select("company_users", {
      filters: { company_id: input.companyId, user_id: input.userId },
      limit: 1,
    });
    return rows[0] ?? null;
  },

  async listAll() {
    const client = getSupabaseAdminClient();
    if (!client) return [];
    return client.select("company_users", {
      order: "created_at.desc",
    });
  },
};
