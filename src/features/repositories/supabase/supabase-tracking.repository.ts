import "server-only";

import type { CustomerTrackingOrder } from "@/features/tracking/tracking.types";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import type { TrackingRepository } from "../repository.types";

export const supabaseTrackingRepository: TrackingRepository = {
  async upsertTrackingOrder(order) {
    const client = getSupabaseAdminClient();
    if (!client) return order;
    const existing = await this.getTrackingByOrderId({
      companyId: order.companyId,
      orderId: order.id,
    });
    const row = trackingToRow(order);
    if (existing) {
      await client.update("tracking_records", row, {
        order_id: order.id,
        company_id: order.companyId,
      });
    } else {
      await client.insert("tracking_records", row);
    }
    return order;
  },

  async getTrackingByOrderId(input) {
    const client = getSupabaseAdminClient();
    if (!client) return null;
    const rows = await client.select("tracking_records", {
      filters: { order_id: input.orderId, company_id: input.companyId },
      limit: 1,
    });
    return (rows[0]?.tracking_json as CustomerTrackingOrder | undefined) ?? null;
  },

  async listTrackingByCompany(companyId) {
    const client = getSupabaseAdminClient();
    if (!client) return [];
    const rows = await client.select("tracking_records", {
      filters: { company_id: companyId },
      order: "created_at.desc",
    });
    return rows
      .map((row) => row.tracking_json as CustomerTrackingOrder | undefined)
      .filter(Boolean) as CustomerTrackingOrder[];
  },
};

function trackingToRow(order: CustomerTrackingOrder) {
  return {
    id: order.id,
    order_id: order.id,
    company_id: order.companyId,
    status: order.orderStatus ?? order.currentStageId,
    current_status: order.currentStageId,
    next_step: order.nextStep,
    progress: 0,
    timeline_json: order.productionTimeline,
    tracking_json: order,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  };
}
