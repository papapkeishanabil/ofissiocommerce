import "server-only";

import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import { SupabaseDatabaseError } from "@/features/database/database.errors";
import type {
  ProcessOrder,
  ProcessOrderEvent,
  ProcessOrderItem,
  ProcessOrderTask,
} from "@/features/process-orders/process-order.types";
import {
  processOrderEventToRow,
  processOrderItemToRow,
  processOrderTaskToRow,
  processOrderToRow,
  rowToProcessOrder,
  rowToProcessOrderEvent,
  rowToProcessOrderItem,
  rowToProcessOrderTask,
} from "@/features/process-orders/process-order.mapper";
import type { ProcessOrderRepository } from "../repository.types";

export const supabaseProcessOrderRepository: ProcessOrderRepository = {
  async createProcessOrder(input) {
    const client = getSupabaseAdminClient();
    if (!client) return input.processOrder;
    const rows = await client.insert("process_orders", processOrderToRow(input.processOrder));
    return rows[0] ? rowToProcessOrder(rows[0]) : input.processOrder;
  },
  async createProcessOrderItems(input) {
    const client = getSupabaseAdminClient();
    if (!client || input.items.length === 0) return input.items;
    const rows = await client.insert(
      "process_order_items",
      input.items.map(processOrderItemToRow),
    );
    return rows.map(rowToProcessOrderItem);
  },
  async createProcessOrderTasks(input) {
    const client = getSupabaseAdminClient();
    if (!client || input.tasks.length === 0) return input.tasks;
    const rows = await client.insert(
      "process_order_tasks",
      input.tasks.map(processOrderTaskToRow),
    );
    return rows.map(rowToProcessOrderTask);
  },
  async listProcessOrders(input = {}) {
    const client = getSupabaseAdminClient();
    if (!client) return [];
    const filters: Record<string, string> = {};
    if (input.companyId) filters.company_id = input.companyId;
    if (input.processRoute) filters.process_route = input.processRoute;
    if (input.processStatus) filters.process_status = input.processStatus;
    return safeProcessRead(async () => {
      const rows = await client.select("process_orders", {
        filters,
        order: "created_at.desc",
      });
      return rows.map(rowToProcessOrder);
    }, []);
  },
  async getProcessOrderById(input) {
    const client = getSupabaseAdminClient();
    if (!client) return null;
    const filters: Record<string, string> = { id: input.processOrderId };
    if (input.companyId) filters.company_id = input.companyId;
    return safeProcessRead(async () => {
      const rows = await client.select("process_orders", {
        filters,
        limit: 1,
      });
      return rows[0] ? rowToProcessOrder(rows[0]) : null;
    }, null);
  },
  async getProcessOrderByOrderId(input) {
    const client = getSupabaseAdminClient();
    if (!client) return null;
    const filters: Record<string, string> = { ofissio_order_id: input.ofissioOrderId };
    if (input.companyId) filters.company_id = input.companyId;
    return safeProcessRead(async () => {
      const rows = await client.select("process_orders", {
        filters,
        limit: 1,
      });
      return rows[0] ? rowToProcessOrder(rows[0]) : null;
    }, null);
  },
  async updateProcessOrder(input) {
    const client = getSupabaseAdminClient();
    if (!client) return null;
    const patch = patchToRow(input.patch);
    if (Object.keys(patch).length === 0) {
      return this.getProcessOrderById(input);
    }
    patch.updated_at = new Date().toISOString();
    const filters: Record<string, string> = { id: input.processOrderId };
    if (input.companyId) filters.company_id = input.companyId;
    const rows = await client.update("process_orders", patch, filters);
    return rows[0] ? rowToProcessOrder(rows[0]) : null;
  },
  async updateTaskStatus(input) {
    const client = getSupabaseAdminClient();
    if (!client) return null;
    const now = new Date().toISOString();
    const rows = await client.update(
      "process_order_tasks",
      {
        status: input.status,
        notes: input.notes ?? null,
        started_at: input.status === "in_progress" ? now : undefined,
        completed_at: input.status === "completed" ? now : undefined,
        updated_at: now,
      },
      { id: input.taskId, process_order_id: input.processOrderId },
    );
    return rows[0] ? rowToProcessOrderTask(rows[0]) : null;
  },
  async addProcessOrderEvent(input) {
    const client = getSupabaseAdminClient();
    if (!client) return input.event;
    const rows = await client.insert("process_order_events", processOrderEventToRow(input.event));
    return rows[0] ? rowToProcessOrderEvent(rows[0]) : input.event;
  },
  async listProcessOrderEvents(input) {
    const client = getSupabaseAdminClient();
    if (!client) return [];
    const filters: Record<string, string> = { process_order_id: input.processOrderId };
    if (input.companyId) filters.company_id = input.companyId;
    return safeProcessRead(async () => {
      const rows = await client.select("process_order_events", {
        filters,
        order: "created_at.desc",
      });
      return rows.map(rowToProcessOrderEvent);
    }, []);
  },
  async listProcessOrderTasks(input) {
    const client = getSupabaseAdminClient();
    if (!client) return [];
    return safeProcessRead(async () => {
      const rows = await client.select("process_order_tasks", {
        filters: { process_order_id: input.processOrderId },
        order: "sort_order.asc",
      });
      return rows.map(rowToProcessOrderTask);
    }, []);
  },
  async listProcessOrderItems(input) {
    const client = getSupabaseAdminClient();
    if (!client) return [];
    return safeProcessRead(async () => {
      const rows = await client.select("process_order_items", {
        filters: { process_order_id: input.processOrderId },
        order: "created_at.asc",
      });
      return rows.map(rowToProcessOrderItem);
    }, []);
  },
};

function patchToRow(patch: Partial<ProcessOrder>) {
  const row: Record<string, unknown> = {};
  if (patch.processStatus) row.process_status = patch.processStatus;
  if (patch.replenishmentStatus) row.replenishment_status = patch.replenishmentStatus;
  if (patch.currentStage) row.current_stage = patch.currentStage;
  if (typeof patch.progress === "number") row.progress = patch.progress;
  if (patch.priority) row.priority = patch.priority;
  if ("deadline" in patch) row.deadline = patch.deadline ?? null;
  if ("assignedTeam" in patch) row.assigned_team = patch.assignedTeam ?? null;
  if ("notes" in patch) row.notes = patch.notes ?? null;
  if ("completedAt" in patch) row.completed_at = patch.completedAt ?? null;
  return row;
}

async function safeProcessRead<T>(callback: () => Promise<T>, fallback: T): Promise<T> {
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
