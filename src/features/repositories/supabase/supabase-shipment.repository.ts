import "server-only";

import { SupabaseDatabaseError } from "@/features/database/database.errors";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import {
  rowToShipment,
  rowToShipmentEvent,
  shipmentEventToRow,
  shipmentPatchToRow,
  shipmentToRow,
} from "@/features/shipments/shipment.mapper";
import type { ShipmentRepository } from "../repository.types";

export const supabaseShipmentRepository: ShipmentRepository = {
  async createShipment(input) {
    const client = getSupabaseAdminClient();
    if (!client) return input.shipment;
    const rows = await client.insert("shipments", shipmentToRow(input.shipment));
    return rows[0] ? rowToShipment(rows[0]) : input.shipment;
  },
  async updateShipment(input) {
    const client = getSupabaseAdminClient();
    if (!client) return null;
    const filters: Record<string, string> = { id: input.shipmentId };
    if (input.companyId) filters.company_id = input.companyId;
    const rows = await client.update(
      "shipments",
      shipmentPatchToRow(input.patch),
      filters,
    );
    return rows[0] ? rowToShipment(rows[0]) : null;
  },
  async getShipmentById(input) {
    const client = getSupabaseAdminClient();
    if (!client) return null;
    const filters: Record<string, string> = { id: input.shipmentId };
    if (input.companyId) filters.company_id = input.companyId;
    return safeShipmentRead(async () => {
      const rows = await client.select("shipments", {
        filters,
        limit: 1,
      });
      return rows[0] ? rowToShipment(rows[0]) : null;
    }, null);
  },
  async getActiveShipmentByOrder(input) {
    const client = getSupabaseAdminClient();
    if (!client) return null;
    const filters: Record<string, string> = { order_id: input.orderId };
    if (input.companyId) filters.company_id = input.companyId;
    return safeShipmentRead(async () => {
      const rows = await client.select("shipments", {
        filters,
        order: "created_at.desc",
        limit: 10,
      });
      return (
        rows.map(rowToShipment).find(
          (shipment) => !shipment.deletedAt && shipment.status !== "cancelled",
        ) ?? null
      );
    }, null);
  },
  async getShipmentByProcessOrder(input) {
    const client = getSupabaseAdminClient();
    if (!client) return null;
    const filters: Record<string, string> = { process_order_id: input.processOrderId };
    if (input.companyId) filters.company_id = input.companyId;
    return safeShipmentRead(async () => {
      const rows = await client.select("shipments", {
        filters,
        order: "created_at.desc",
        limit: 1,
      });
      return rows[0] ? rowToShipment(rows[0]) : null;
    }, null);
  },
  async listShipments(input = {}) {
    const client = getSupabaseAdminClient();
    if (!client) return [];
    const filters: Record<string, string> = {};
    if (input.companyId) filters.company_id = input.companyId;
    if (input.orderId) filters.order_id = input.orderId;
    if (input.processOrderId) filters.process_order_id = input.processOrderId;
    if (input.status) filters.status = input.status;
    return safeShipmentRead(async () => {
      const rows = await client.select("shipments", {
        filters,
        order: "created_at.desc",
      });
      return rows
        .map(rowToShipment)
        .filter((shipment) => (input.includeDeleted ? true : !shipment.deletedAt));
    }, []);
  },
  async addShipmentEvent(input) {
    const client = getSupabaseAdminClient();
    if (!client) return input.event;
    const rows = await client.insert(
      "shipment_events",
      shipmentEventToRow(input.event),
    );
    return rows[0] ? rowToShipmentEvent(rows[0]) : input.event;
  },
  async listShipmentEvents(input) {
    const client = getSupabaseAdminClient();
    if (!client) return [];
    const filters: Record<string, string> = {};
    if (input.shipmentId) filters.shipment_id = input.shipmentId;
    if (input.orderId) filters.order_id = input.orderId;
    if (input.companyId) filters.company_id = input.companyId;
    return safeShipmentRead(async () => {
      const rows = await client.select("shipment_events", {
        filters,
        order: "created_at.desc",
      });
      return rows.map(rowToShipmentEvent);
    }, []);
  },
};

async function safeShipmentRead<T>(callback: () => Promise<T>, fallback: T): Promise<T> {
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
