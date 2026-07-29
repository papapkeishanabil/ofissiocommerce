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

  async listAll() {
    const client = getSupabaseAdminClient();
    if (!client) return [];
    const rows = await client.select("audit_logs", {
      order: "created_at.desc",
      limit: 200,
    });
    return rows.map((row) => ({
      id: String(row.id),
      actorId: row.actor_id ? String(row.actor_id) : null,
      actorType:
        row.actor_type === "internal" || row.actor_type === "customer"
          ? row.actor_type
          : "system",
      companyId: row.company_id ? String(row.company_id) : null,
      action: String(row.action),
      entityType: String(row.entity_type),
      entityId: row.entity_id ? String(row.entity_id) : null,
      metadata:
        row.metadata_json &&
        typeof row.metadata_json === "object" &&
        !Array.isArray(row.metadata_json)
          ? (row.metadata_json as Record<string, unknown>)
          : {},
      ipAddress: row.ip_address ? String(row.ip_address) : null,
      userAgent: row.user_agent ? String(row.user_agent) : null,
      createdAt: String(row.created_at),
    }));
  },
};
