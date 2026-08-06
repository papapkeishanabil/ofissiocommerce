import "server-only";

import { getDatabaseRuntimeConfig } from "@/features/database/database.config";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";

import type {
  GineeOrderSnapshot,
  GineeProductMapping,
  GineeRepository,
  GineeWebhookEvent,
} from "./ginee.types";

type Row = Record<string, unknown>;
type GineeState = {
  mappings: GineeProductMapping[];
  snapshots: GineeOrderSnapshot[];
  webhookEvents: GineeWebhookEvent[];
};
type GineeGlobal = typeof globalThis & { __ofissioGineeState?: GineeState };

export function createInMemoryGineeRepository(): GineeRepository {
  const runtime = globalThis as GineeGlobal;
  const state = runtime.__ofissioGineeState ?? (runtime.__ofissioGineeState = {
    mappings: [],
    snapshots: [],
    webhookEvents: [],
  });
  return {
    async listMappings() {
      return structuredClone(state.mappings);
    },
    async upsertMapping(mapping) {
      const index = state.mappings.findIndex((item) => item.id === mapping.id || mappingKey(item) === mappingKey(mapping));
      if (index >= 0) state.mappings[index] = structuredClone(mapping);
      else state.mappings.push(structuredClone(mapping));
      return structuredClone(mapping);
    },
    async getMappingByStockSku(stockSku) {
      return structuredClone(state.mappings.find((item) => item.stockSku === stockSku) ?? null);
    },
    async findOrderSnapshot(input) {
      return structuredClone(state.snapshots.find((item) =>
        item.gineeOrderId === input.gineeOrderId ||
        Boolean(input.channelOrderId && item.channelOrderId === input.channelOrderId),
      ) ?? null);
    },
    async saveOrderSnapshot(snapshot) {
      const index = state.snapshots.findIndex((item) => item.gineeOrderId === snapshot.gineeOrderId);
      if (index >= 0) state.snapshots[index] = structuredClone(snapshot);
      else state.snapshots.push(structuredClone(snapshot));
      return structuredClone(snapshot);
    },
    async findWebhookByKey(idempotencyKey) {
      return structuredClone(state.webhookEvents.find((item) => item.idempotencyKey === idempotencyKey) ?? null);
    },
    async saveWebhookEvent(event) {
      const existing = state.webhookEvents.find((item) => item.idempotencyKey === event.idempotencyKey);
      if (existing) return structuredClone(existing);
      state.webhookEvents.unshift(structuredClone(event));
      return structuredClone(event);
    },
    async listWebhookEvents(limit = 50) {
      return structuredClone(state.webhookEvents.slice(0, Math.max(1, Math.min(limit, 100))));
    },
  };
}

const supabaseGineeRepository: GineeRepository = {
  async listMappings() {
    const client = requireClient();
    const rows = await client.select<Row>("ginee_product_mappings", {
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
    const rows = existing[0]
      ? await client.update<Row>("ginee_product_mappings", mappingToRow(mapping), { id: String(existing[0].id) })
      : await client.insert<Row>("ginee_product_mappings", mappingToRow(mapping));
    return mappingFromRow(rows[0] ?? mappingToRow(mapping));
  },
  async getMappingByStockSku(stockSku) {
    const client = requireClient();
    const rows = await client.select<Row>("ginee_product_mappings", {
      filters: { stock_sku: stockSku },
      limit: 1,
    });
    return rows[0] ? mappingFromRow(rows[0]) : null;
  },
  async findOrderSnapshot(input) {
    const client = requireClient();
    const byGineeId = await client.select<Row>("ginee_order_snapshots", {
      filters: { ginee_order_id: input.gineeOrderId },
      limit: 1,
    });
    if (byGineeId[0]) return snapshotFromRow(byGineeId[0]);
    if (!input.channelOrderId) return null;
    const byChannelId = await client.select<Row>("ginee_order_snapshots", {
      filters: { channel_order_id: input.channelOrderId },
      limit: 1,
    });
    return byChannelId[0] ? snapshotFromRow(byChannelId[0]) : null;
  },
  async saveOrderSnapshot(snapshot) {
    const client = requireClient();
    const existing = await client.select<Row>("ginee_order_snapshots", {
      filters: { ginee_order_id: snapshot.gineeOrderId },
      limit: 1,
    });
    const rows = existing[0]
      ? await client.update<Row>("ginee_order_snapshots", snapshotToRow(snapshot), { id: String(existing[0].id) })
      : await client.insert<Row>("ginee_order_snapshots", snapshotToRow(snapshot));
    return snapshotFromRow(rows[0] ?? snapshotToRow(snapshot));
  },
  async findWebhookByKey(idempotencyKey) {
    const client = requireClient();
    const rows = await client.select<Row>("ginee_webhook_events", {
      filters: { idempotency_key: idempotencyKey },
      limit: 1,
    });
    return rows[0] ? webhookFromRow(rows[0]) : null;
  },
  async saveWebhookEvent(event) {
    const existing = await this.findWebhookByKey(event.idempotencyKey);
    if (existing) return existing;
    try {
      const rows = await requireClient().insert<Row>("ginee_webhook_events", webhookToRow(event));
      return webhookFromRow(rows[0] ?? webhookToRow(event));
    } catch (error) {
      // A concurrent delivery can win after the lookup. The unique
      // idempotency_key remains the final guard, so return that row instead of
      // surfacing a duplicate as a webhook failure.
      const duplicate = await this.findWebhookByKey(event.idempotencyKey);
      if (duplicate) return duplicate;
      throw error;
    }
  },
  async listWebhookEvents(limit = 50) {
    const rows = await requireClient().select<Row>("ginee_webhook_events", {
      order: "created_at.desc",
      limit: Math.max(1, Math.min(limit, 100)),
    });
    return rows.map(webhookFromRow);
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
    company_id: value.companyId,
    ofissio_product_id: value.ofissioProductId,
    woocommerce_product_id: value.woocommerceProductId,
    woocommerce_variation_id: value.woocommerceVariationId,
    parent_sku: value.parentSku,
    stock_sku: value.stockSku,
    size_label: value.sizeLabel,
    color_label: value.colorLabel,
    ginee_product_id: value.gineeProductId,
    ginee_variation_id: value.gineeVariationId,
    ginee_master_product_id: value.gineeMasterProductId,
    ginee_sku: value.gineeSku,
    ginee_warehouse_id: value.gineeWarehouseId,
    sync_stock_enabled: false,
    sync_order_enabled: false,
    last_synced_at: value.lastSyncedAt,
    created_at: value.createdAt,
    updated_at: value.updatedAt,
  };
}

function mappingFromRow(row: Row): GineeProductMapping {
  return {
    id: String(row.id ?? ""),
    companyId: nullable(row.company_id),
    ofissioProductId: nullable(row.ofissio_product_id),
    woocommerceProductId: nullable(row.woocommerce_product_id),
    woocommerceVariationId: nullable(row.woocommerce_variation_id),
    parentSku: String(row.parent_sku ?? ""),
    stockSku: String(row.stock_sku ?? ""),
    sizeLabel: nullable(row.size_label),
    colorLabel: nullable(row.color_label),
    gineeProductId: nullable(row.ginee_product_id),
    gineeVariationId: nullable(row.ginee_variation_id),
    gineeMasterProductId: nullable(row.ginee_master_product_id),
    gineeSku: String(row.ginee_sku ?? ""),
    gineeWarehouseId: nullable(row.ginee_warehouse_id),
    syncStockEnabled: Boolean(row.sync_stock_enabled),
    syncOrderEnabled: Boolean(row.sync_order_enabled),
    lastSyncedAt: nullable(row.last_synced_at),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function snapshotToRow(value: GineeOrderSnapshot): Row {
  return {
    id: value.id,
    ginee_order_id: value.gineeOrderId,
    channel_order_id: value.channelOrderId,
    shop_id: value.shopId,
    status: value.status,
    raw_status: value.rawStatus,
    order_created_at: value.orderCreatedAt,
    order_updated_at: value.orderUpdatedAt,
    mapped_status: value.mappedStatus,
    unmapped_skus: value.unmappedSkus,
    sanitized_snapshot: value.sanitizedSnapshot,
    created_at: value.createdAt,
    updated_at: value.updatedAt,
  };
}

function snapshotFromRow(row: Row): GineeOrderSnapshot {
  return {
    id: String(row.id ?? ""),
    gineeOrderId: String(row.ginee_order_id ?? ""),
    channelOrderId: nullable(row.channel_order_id),
    shopId: nullable(row.shop_id),
    status: nullable(row.status),
    rawStatus: nullable(row.raw_status),
    orderCreatedAt: nullable(row.order_created_at),
    orderUpdatedAt: nullable(row.order_updated_at),
    mappedStatus: nullable(row.mapped_status),
    unmappedSkus: stringArray(row.unmapped_skus),
    sanitizedSnapshot: objectValue(row.sanitized_snapshot),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function webhookToRow(value: GineeWebhookEvent): Row {
  return {
    id: value.id,
    event_id: value.eventId,
    event_type: value.eventType,
    entity_type: value.entityType,
    entity_id: value.entityId,
    status: value.status,
    idempotency_key: value.idempotencyKey,
    sanitized_payload: value.sanitizedPayload,
    processed_at: value.processedAt,
    created_at: value.createdAt,
  };
}

function webhookFromRow(row: Row): GineeWebhookEvent {
  return {
    id: String(row.id ?? ""),
    eventId: nullable(row.event_id),
    eventType: String(row.event_type ?? "unknown"),
    entityType: nullable(row.entity_type),
    entityId: nullable(row.entity_id),
    status: String(row.status ?? "received"),
    idempotencyKey: String(row.idempotency_key ?? ""),
    sanitizedPayload: objectValue(row.sanitized_payload),
    processedAt: nullable(row.processed_at),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function nullable(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}
