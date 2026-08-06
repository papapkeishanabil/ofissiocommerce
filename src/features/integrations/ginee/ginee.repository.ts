import "server-only";

import { getDatabaseRuntimeConfig } from "@/features/database/database.config";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";

import type {
  GineeInventorySnapshot,
  GineeProductMapping,
  GineeRepository,
} from "./ginee.types";

type Row = Record<string, unknown>;
type GineeState = {
  mappings: GineeProductMapping[];
  inventorySnapshots: GineeInventorySnapshot[];
};
type GineeGlobal = typeof globalThis & { __ofissioGineeInventoryState?: GineeState };

export function createInMemoryGineeRepository(): GineeRepository {
  const runtime = globalThis as GineeGlobal;
  const state = runtime.__ofissioGineeInventoryState ?? (runtime.__ofissioGineeInventoryState = {
    mappings: [],
    inventorySnapshots: [],
  });

  return {
    async listMappings() {
      return structuredClone(state.mappings);
    },
    async upsertMapping(mapping) {
      const index = state.mappings.findIndex((item) =>
        item.id === mapping.id || mappingKey(item) === mappingKey(mapping),
      );
      if (index >= 0) {
        const existing = state.mappings[index];
        state.mappings[index] = structuredClone({
          ...mapping,
          id: existing?.id ?? mapping.id,
          createdAt: existing?.createdAt ?? mapping.createdAt,
        });
        return structuredClone(state.mappings[index]);
      }
      state.mappings.push(structuredClone(mapping));
      return structuredClone(mapping);
    },
    async getMappingByStockSku(stockSku) {
      return structuredClone(state.mappings.find((item) => item.stockSku === stockSku) ?? null);
    },
    async updateMappingStock(input) {
      const mapping = state.mappings.find((item) => item.id === input.mappingId);
      if (!mapping) return null;
      mapping.lastStock = input.lastStock;
      mapping.lastCheckedAt = input.lastCheckedAt;
      mapping.updatedAt = input.lastCheckedAt;
      return structuredClone(mapping);
    },
    async saveInventorySnapshots(snapshots) {
      state.inventorySnapshots.unshift(...structuredClone(snapshots));
      state.inventorySnapshots = state.inventorySnapshots.slice(0, 500);
      return structuredClone(snapshots);
    },
    async listInventorySnapshots(limit = 100) {
      return structuredClone(state.inventorySnapshots.slice(0, clampLimit(limit)));
    },
  };
}

const supabaseGineeRepository: GineeRepository = {
  async listMappings() {
    const rows = await requireClient().select<Row>("ginee_product_mappings", {
      order: "updated_at.desc",
      limit: 500,
    });
    return rows.map(mappingFromRow);
  },
  async upsertMapping(mapping) {
    const client = requireClient();
    const existing = await client.select<Row>("ginee_product_mappings", {
      filters: {
        stock_sku: mapping.stockSku,
        ginee_sku: mapping.gineeSku,
        ginee_warehouse_id: mapping.gineeWarehouseId,
      },
      limit: 1,
    });
    const row = mappingToRow({
      ...mapping,
      id: existing[0] ? String(existing[0].id) : mapping.id,
      createdAt: existing[0] ? String(existing[0].created_at) : mapping.createdAt,
    });
    const rows = existing[0]
      ? await client.update<Row>("ginee_product_mappings", row, { id: String(existing[0].id) })
      : await client.insert<Row>("ginee_product_mappings", row);
    return mappingFromRow(rows[0] ?? row);
  },
  async getMappingByStockSku(stockSku) {
    const rows = await requireClient().select<Row>("ginee_product_mappings", {
      filters: { stock_sku: stockSku },
      limit: 1,
    });
    return rows[0] ? mappingFromRow(rows[0]) : null;
  },
  async updateMappingStock(input) {
    const rows = await requireClient().update<Row>("ginee_product_mappings", {
      last_stock: input.lastStock,
      last_checked_at: input.lastCheckedAt,
      updated_at: input.lastCheckedAt,
    }, { id: input.mappingId });
    return rows[0] ? mappingFromRow(rows[0]) : null;
  },
  async saveInventorySnapshots(snapshots) {
    if (!snapshots.length) return [];
    const rows = await requireClient().insert<Row>(
      "ginee_inventory_snapshots",
      snapshots.map(snapshotToRow),
    );
    return rows.map(snapshotFromRow);
  },
  async listInventorySnapshots(limit = 100) {
    const rows = await requireClient().select<Row>("ginee_inventory_snapshots", {
      order: "checked_at.desc",
      limit: clampLimit(limit),
    });
    return rows.map(snapshotFromRow);
  },
};

const inMemoryRepository = createInMemoryGineeRepository();

export function getGineeRepository() {
  return getDatabaseRuntimeConfig().provider === "supabase"
    ? supabaseGineeRepository
    : inMemoryRepository;
}

function requireClient() {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Ginee Supabase repository belum dikonfigurasi.");
  return client;
}

function mappingKey(mapping: GineeProductMapping) {
  return `${mapping.stockSku}|${mapping.gineeSku}|${mapping.gineeWarehouseId ?? ""}`;
}

function mappingToRow(value: GineeProductMapping): Row {
  return {
    id: value.id,
    parent_sku: value.parentSku,
    stock_sku: value.stockSku,
    size_label: value.sizeLabel,
    color_label: value.colorLabel,
    woocommerce_product_id: value.woocommerceProductId,
    woocommerce_variation_id: value.woocommerceVariationId,
    ginee_sku: value.gineeSku,
    ginee_warehouse_id: value.gineeWarehouseId,
    last_stock: value.lastStock,
    last_checked_at: value.lastCheckedAt,
    sync_stock_enabled: false,
    created_at: value.createdAt,
    updated_at: value.updatedAt,
  };
}

function mappingFromRow(row: Row): GineeProductMapping {
  return {
    id: String(row.id ?? ""),
    parentSku: String(row.parent_sku ?? ""),
    stockSku: String(row.stock_sku ?? ""),
    sizeLabel: nullable(row.size_label),
    colorLabel: nullable(row.color_label),
    woocommerceProductId: nullable(row.woocommerce_product_id),
    woocommerceVariationId: nullable(row.woocommerce_variation_id),
    gineeSku: String(row.ginee_sku ?? ""),
    gineeWarehouseId: nullable(row.ginee_warehouse_id),
    lastStock: nullableNumber(row.last_stock),
    lastCheckedAt: nullable(row.last_checked_at ?? row.last_synced_at),
    syncStockEnabled: false,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function snapshotToRow(value: GineeInventorySnapshot): Row {
  return {
    id: value.id,
    mapping_id: value.mappingId,
    stock_sku: value.stockSku,
    ginee_sku: value.gineeSku,
    ginee_warehouse_id: value.gineeWarehouseId,
    warehouse_name: value.warehouseName,
    warehouse_stock: value.warehouseStock,
    available_stock: value.availableStock,
    reserved_stock: value.reservedStock,
    locked_stock: value.lockedStock,
    checked_at: value.checkedAt,
    created_at: value.createdAt,
  };
}

function snapshotFromRow(row: Row): GineeInventorySnapshot {
  return {
    id: String(row.id ?? ""),
    mappingId: nullable(row.mapping_id),
    stockSku: String(row.stock_sku ?? ""),
    gineeSku: String(row.ginee_sku ?? ""),
    gineeWarehouseId: nullable(row.ginee_warehouse_id),
    warehouseName: nullable(row.warehouse_name),
    warehouseStock: numberValue(row.warehouse_stock),
    availableStock: numberValue(row.available_stock),
    reservedStock: numberValue(row.reserved_stock),
    lockedStock: numberValue(row.locked_stock),
    checkedAt: String(row.checked_at ?? new Date().toISOString()),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function nullable(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function clampLimit(value: number) {
  return Math.max(1, Math.min(Math.floor(value), 500));
}
