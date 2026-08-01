import "server-only";

import { SupabaseDatabaseError } from "@/features/database/database.errors";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import {
  adminNotificationPatchToRow,
  adminNotificationToRow,
  rowToAdminNotification,
} from "@/features/admin-notifications/admin-notification.mapper";
import type { AdminNotificationRepository } from "../repository.types";

export const supabaseAdminNotificationRepository: AdminNotificationRepository = {
  async create(notification) {
    const client = getSupabaseAdminClient();
    if (!client) return notification;
    try {
      const rows = await client.insert(
        "admin_notifications",
        adminNotificationToRow(notification),
      );
      return rows[0] ? rowToAdminNotification(rows[0]) : notification;
    } catch (error) {
      const existing = await this.getByEntity({
        type: notification.type,
        entityType: notification.entityType,
        entityId: notification.entityId,
      });
      if (existing) return existing;
      throw error;
    }
  },
  async getById(id) {
    const client = getSupabaseAdminClient();
    if (!client) return null;
    return safeNotificationRead(async () => {
      const rows = await client.select("admin_notifications", {
        filters: { id },
        limit: 1,
      });
      return rows[0] ? rowToAdminNotification(rows[0]) : null;
    }, null);
  },
  async getByEntity(input) {
    const client = getSupabaseAdminClient();
    if (!client) return null;
    return safeNotificationRead(async () => {
      const rows = await client.select("admin_notifications", {
        filters: {
          type: input.type,
          entity_type: input.entityType,
          entity_id: input.entityId,
        },
        limit: 1,
      });
      return rows[0] ? rowToAdminNotification(rows[0]) : null;
    }, null);
  },
  async listAll() {
    const client = getSupabaseAdminClient();
    if (!client) return [];
    return safeNotificationRead(async () => {
      const rows = await client.select("admin_notifications", {
        order: "created_at.desc",
      });
      return rows.map(rowToAdminNotification);
    }, []);
  },
  async update(id, patch) {
    const client = getSupabaseAdminClient();
    if (!client) return null;
    const rows = await client.update(
      "admin_notifications",
      adminNotificationPatchToRow(patch),
      { id },
    );
    return rows[0] ? rowToAdminNotification(rows[0]) : null;
  },
  async claimEmail(id, claimId) {
    const client = getSupabaseAdminClient();
    if (!client) return false;
    const rows = await client.update(
      "admin_notifications",
      {
        email_id: claimId,
        updated_at: new Date().toISOString(),
      },
      { id, email_status: "pending", email_id: null },
    );
    return rows.length === 1;
  },
};

async function safeNotificationRead<T>(callback: () => Promise<T>, fallback: T) {
  try {
    return await callback();
  } catch (error) {
    if (
      error instanceof SupabaseDatabaseError &&
      error.reason === "relation_does_not_exist"
    ) {
      return fallback;
    }
    throw error;
  }
}
