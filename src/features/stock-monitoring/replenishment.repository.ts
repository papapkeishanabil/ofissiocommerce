import "server-only";

import { SupabaseDatabaseError } from "@/features/database/database.errors";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import { getRepositoryProvider } from "@/features/repositories/repository.config";

import type {
  ProductionReplenishmentRequest,
  ReplenishmentRepository,
} from "./stock-monitoring.types";

type StockMonitoringGlobal = typeof globalThis & {
  __ofissioReplenishmentRequests?: Map<string, ProductionReplenishmentRequest>;
};

const memoryState =
  (globalThis as StockMonitoringGlobal).__ofissioReplenishmentRequests ??
  ((globalThis as StockMonitoringGlobal).__ofissioReplenishmentRequests = new Map());

export function createInMemoryReplenishmentRepository(): ReplenishmentRepository {
  const state = new Map<string, ProductionReplenishmentRequest>();
  return memoryRepository(state);
}

export function getReplenishmentRepository(): ReplenishmentRepository {
  return getRepositoryProvider() === "supabase"
    ? supabaseRepository
    : memoryRepository(memoryState);
}

function memoryRepository(
  state: Map<string, ProductionReplenishmentRequest>,
): ReplenishmentRepository {
  return {
    async findByIdempotencyKey(key) {
      return clone(
        [...state.values()].find((request) => request.idempotencyKey === key) ?? null,
      );
    },
    async create(request) {
      const existing = [...state.values()].find(
        (item) => item.idempotencyKey === request.idempotencyKey,
      );
      if (existing) return clone(existing)!;
      state.set(request.id, clone(request)!);
      return clone(request)!;
    },
    async listByOrder(orderId) {
      return [...state.values()]
        .filter((request) => request.orderId === orderId)
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
        .map((request) => clone(request)!);
    },
  };
}

const supabaseRepository: ReplenishmentRepository = {
  async findByIdempotencyKey(key) {
    const client = getSupabaseAdminClient();
    if (!client) return null;
    try {
      const rows = await client.select("production_replenishment_requests", {
        filters: { idempotency_key: key },
        limit: 1,
      });
      return rows[0] ? fromRow(rows[0]) : null;
    } catch (error) {
      if (isMissingMigration(error)) return null;
      throw error;
    }
  },
  async create(request) {
    const client = getSupabaseAdminClient();
    if (!client) return request;
    try {
      const rows = await client.insert(
        "production_replenishment_requests",
        toRow(request),
      );
      return rows[0] ? fromRow(rows[0]) : request;
    } catch (error) {
      const existing = await this.findByIdempotencyKey(request.idempotencyKey);
      if (existing) return existing;
      throw error;
    }
  },
  async listByOrder(orderId) {
    const client = getSupabaseAdminClient();
    if (!client) return [];
    try {
      const rows = await client.select("production_replenishment_requests", {
        filters: { order_id: orderId },
        order: "created_at.desc",
      });
      return rows.map(fromRow);
    } catch (error) {
      if (isMissingMigration(error)) return [];
      throw error;
    }
  },
};

function toRow(request: ProductionReplenishmentRequest) {
  return {
    id: request.id,
    idempotency_key: request.idempotencyKey,
    company_id: request.companyId,
    order_id: request.orderId,
    parent_sku: request.parentSku,
    stock_sku: request.stockSku,
    size_label: request.sizeLabel,
    required_qty: request.requiredQty,
    available_stock: request.availableStock,
    shortage_qty: request.shortageQty,
    reason: request.reason,
    status: request.status,
    created_by: request.createdBy,
    created_at: request.createdAt,
    updated_at: request.updatedAt,
  };
}

function fromRow(row: Record<string, unknown>): ProductionReplenishmentRequest {
  return {
    id: String(row.id ?? ""),
    idempotencyKey: String(row.idempotency_key ?? ""),
    companyId: nullableString(row.company_id),
    orderId: nullableString(row.order_id),
    parentSku: String(row.parent_sku ?? ""),
    stockSku: String(row.stock_sku ?? ""),
    sizeLabel: nullableString(row.size_label),
    requiredQty: numberValue(row.required_qty),
    availableStock: numberValue(row.available_stock),
    shortageQty: numberValue(row.shortage_qty),
    reason: String(row.reason ?? "replenishment") as ProductionReplenishmentRequest["reason"],
    status: String(row.status ?? "requested") as ProductionReplenishmentRequest["status"],
    createdBy: String(row.created_by ?? "system"),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
  };
}

function isMissingMigration(error: unknown) {
  return error instanceof SupabaseDatabaseError && error.reason === "relation_does_not_exist";
}

function nullableString(value: unknown) {
  return value == null || value === "" ? null : String(value);
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

function clone<T>(value: T): T {
  return value == null ? value : structuredClone(value);
}
