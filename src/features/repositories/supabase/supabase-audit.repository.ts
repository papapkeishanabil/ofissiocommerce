import "server-only";

import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import type { AuditLogRepository } from "../repository.types";

export const supabaseAuditRepository: AuditLogRepository = {
  async writeAuditLog(event) {
    const client = getSupabaseAdminClient();
    if (!client) return;
    await client.insert("audit_logs", {
      id: event.id,
      actor_id: event.actorId,
      actor_type: event.actorType,
      company_id: event.companyId,
      action: event.action,
      entity_type: event.entityType,
      entity_id: event.entityId,
      metadata_json: event.metadata,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
      created_at: event.createdAt,
    });
  },
};
