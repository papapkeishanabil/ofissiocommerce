import "server-only";

import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

import { logAuditEvent } from "@/lib/security/audit-log";
import { createApiError, logInternalError } from "@/lib/security/safe-error-response";

import { getGineeConfig, validateGineeConfig } from "./ginee.config";
import { sanitizedGineeOrderSnapshot } from "./ginee.mapper";
import { getGineeRepository } from "./ginee.repository";
import type {
  GineeProductMapping,
  GineeProviderAdapter,
  GineeRepository,
  GineeShop,
  GineeWebhookEvent,
} from "./ginee.types";
import { liveGineeProvider } from "./providers/ginee.provider";
import { mockGineeProvider } from "./providers/mock-ginee.provider";

export function getGineeProvider(): GineeProviderAdapter {
  return getGineeConfig().useLiveProvider ? liveGineeProvider : mockGineeProvider;
}

export async function getGineeHealth(provider = getGineeProvider(), knownShops?: GineeShop[]) {
  const config = getGineeConfig();
  const errors = validateGineeConfig(config);
  const connection = knownShops
    ? { ok: true, shops: knownShops.length }
    : await provider.validateConnection();
  return {
    enabled: config.enabled,
    configured: config.isConfigured,
    mode: config.mode,
    providerMode: config.useLiveProvider ? "live_read_only" : "mock_read_only",
    testLive: config.testLive,
    connectionOk: connection.ok,
    shopCount: connection.shops,
    configErrors: errors,
    destructiveSyncEnabled: false,
  } as const;
}

export async function listGineeShops(provider = getGineeProvider()) {
  return provider.listShops();
}

export async function listRecentGineeOrders(provider = getGineeProvider()) {
  return provider.listOrders();
}

export async function getGineeOrderDetail(input: {
  orderId: string;
  provider?: GineeProviderAdapter;
  repository?: GineeRepository;
}) {
  assertIdentifier(input.orderId, "Ginee order ID");
  const provider = input.provider ?? getGineeProvider();
  const repository = input.repository ?? getGineeRepository();
  const order = await provider.getOrderDetails(input.orderId);
  if (!order) throw createApiError("NOT_FOUND", "Order Ginee tidak ditemukan.", 404);
  const mappings = await repository.listMappings().catch(() => []);
  const mappedSkus = new Set(mappings.map((item) => item.gineeSku));
  const unmappedSkus = order.items.map((item) => item.stockSku).filter((sku) => !mappedSkus.has(sku));
  const existingSnapshot = await repository.findOrderSnapshot({
    gineeOrderId: order.gineeOrderId,
    channelOrderId: order.channelOrderId,
  }).catch(() => null);
  const now = new Date().toISOString();
  try {
    await repository.saveOrderSnapshot({
      id: randomUUID(),
      gineeOrderId: order.gineeOrderId,
      channelOrderId: order.channelOrderId,
      shopId: order.shopId,
      status: order.status,
      rawStatus: order.rawStatus,
      orderCreatedAt: order.orderCreatedAt,
      orderUpdatedAt: order.orderUpdatedAt,
      mappedStatus: order.status,
      unmappedSkus,
      sanitizedSnapshot: sanitizedGineeOrderSnapshot(order),
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    logInternalError(error, { area: "ginee", operation: "save_order_snapshot" });
  }
  return {
    order,
    unmappedSkus,
    duplicate: Boolean(existingSnapshot),
    duplicateBy: existingSnapshot
      ? existingSnapshot.gineeOrderId === order.gineeOrderId
        ? "ginee_order_id"
        : "channel_order_id"
      : null,
  };
}

export async function pullInventoryByStockSku(input: {
  stockSku: string;
  provider?: GineeProviderAdapter;
  repository?: GineeRepository;
}) {
  const stockSku = normalizeSku(input.stockSku);
  const repository = input.repository ?? getGineeRepository();
  const mapping = await repository.getMappingByStockSku(stockSku).catch(() => null);
  const inventory = await (input.provider ?? getGineeProvider()).getWarehouseInventoryBySku(
    stockSku,
    mapping?.gineeWarehouseId,
  );
  return { stockSku, mapped: Boolean(mapping), mapping, inventory };
}

export async function pullInventoryForMappedProducts(input: {
  provider?: GineeProviderAdapter;
  repository?: GineeRepository;
} = {}) {
  const repository = input.repository ?? getGineeRepository();
  const provider = input.provider ?? getGineeProvider();
  const mappings = await repository.listMappings();
  return Promise.all(mappings.map(async (mapping) => ({
    mapping,
    inventory: await provider.getWarehouseInventoryBySku(mapping.gineeSku, mapping.gineeWarehouseId),
  })));
}

export async function compareWooCommerceVsGineeStock(input: {
  wooStockSkus: string[];
  provider?: GineeProviderAdapter;
  repository?: GineeRepository;
}) {
  const repository = input.repository ?? getGineeRepository();
  const provider = input.provider ?? getGineeProvider();
  const mappings = await repository.listMappings();
  const normalizedWoo = [...new Set(input.wooStockSkus.map(normalizeSku))];
  const mappedStock = new Set(mappings.map((item) => item.stockSku));
  const results = await Promise.all(mappings.map(async (mapping) => ({
    stockSku: mapping.stockSku,
    gineeSku: mapping.gineeSku,
    inventory: await provider.getWarehouseInventoryBySku(mapping.gineeSku, mapping.gineeWarehouseId),
  })));
  return {
    matches: results,
    unmappedWooSkus: normalizedWoo.filter((sku) => !mappedStock.has(sku)),
    unmappedGineeSkus: detectUnmappedGineeSku(
      results.flatMap((item) => item.inventory.map((inventory) => inventory.stockSku)),
      mappings,
    ),
  };
}

export function detectUnmappedGineeSku(gineeSkus: string[], mappings: GineeProductMapping[]) {
  const mapped = new Set(mappings.map((item) => item.gineeSku));
  return [...new Set(gineeSkus.map(normalizeSku))].filter((sku) => !mapped.has(sku));
}

export function detectUnmappedWooSku(wooSkus: string[], mappings: GineeProductMapping[]) {
  const mapped = new Set(mappings.map((item) => item.stockSku));
  return [...new Set(wooSkus.map(normalizeSku))].filter((sku) => !mapped.has(sku));
}

export async function listGineeMappings(repository = getGineeRepository()) {
  return repository.listMappings();
}

export async function saveGineeMapping(
  input: Partial<GineeProductMapping> & Pick<GineeProductMapping, "parentSku" | "stockSku" | "gineeSku">,
  repository = getGineeRepository(),
) {
  const now = new Date().toISOString();
  const parentSku = normalizeSku(input.parentSku);
  const stockSku = normalizeSku(input.stockSku);
  const gineeSku = normalizeSku(input.gineeSku);
  if (!stockSku.startsWith(`${parentSku}-`) && stockSku !== parentSku) {
    throw createApiError("VALIDATION_ERROR", "Stock SKU harus menggunakan parent SKU sebagai prefix.", 400);
  }
  const mapping: GineeProductMapping = {
    id: input.id || randomUUID(),
    companyId: input.companyId ?? null,
    ofissioProductId: cleanNullable(input.ofissioProductId),
    woocommerceProductId: cleanNullable(input.woocommerceProductId),
    woocommerceVariationId: cleanNullable(input.woocommerceVariationId),
    parentSku,
    stockSku,
    sizeLabel: cleanNullable(input.sizeLabel),
    colorLabel: cleanNullable(input.colorLabel),
    gineeProductId: cleanNullable(input.gineeProductId),
    gineeVariationId: cleanNullable(input.gineeVariationId),
    gineeMasterProductId: cleanNullable(input.gineeMasterProductId),
    gineeSku,
    gineeWarehouseId: cleanNullable(input.gineeWarehouseId),
    syncStockEnabled: false,
    syncOrderEnabled: false,
    lastSyncedAt: input.lastSyncedAt ?? null,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };
  return repository.upsertMapping(mapping);
}

export async function listGineeWebhookEvents(repository = getGineeRepository()) {
  return repository.listWebhookEvents(50);
}

export async function processGineeWebhook(input: {
  headers: Headers;
  rawBody: string;
  payload: Record<string, unknown>;
  request?: Request;
  repository?: GineeRepository;
  expectedSecret?: string;
}) {
  const expectedSecret = input.expectedSecret ?? getGineeConfig().webhookSecret;
  if (!verifyGineeWebhookSecret(input.headers, expectedSecret)) {
    throw createApiError("UNAUTHORIZED", "Webhook Ginee tidak valid.", 401);
  }
  const repository = input.repository ?? getGineeRepository();
  const eventType = safeText(input.payload.eventType ?? input.payload.event ?? input.payload.type, "unknown");
  const entityType = safeNullable(input.payload.entityType ?? input.payload.resourceType) ??
    (eventType.toLowerCase().includes("order") ? "order" : null);
  const entityId = safeNullable(
    input.payload.entityId ?? input.payload.orderId ?? input.payload.order_id ?? input.payload.dataId,
  );
  const eventId = safeNullable(input.payload.eventId ?? input.payload.event_id ?? input.headers.get("x-ginee-event-id"));
  const timestamp = safeNullable(input.payload.timestamp ?? input.payload.updatedAt ?? input.headers.get("x-ginee-timestamp"));
  const idempotencyKey = eventId
    ? `ginee_event_${eventId}`
    : `ginee_${createHash("sha256").update(`${eventType}|${entityId ?? ""}|${timestamp ?? ""}|${input.rawBody}`).digest("hex")}`;
  const existing = await repository.findWebhookByKey(idempotencyKey);
  if (existing) return { idempotent: true, event: existing };

  const event: GineeWebhookEvent = {
    id: randomUUID(),
    eventId,
    eventType,
    entityType,
    entityId,
    status: entityType === "order" ? "pending_refetch" : "received",
    idempotencyKey,
    sanitizedPayload: {
      eventType,
      entityType,
      entityId,
      timestamp,
      requiresRefetch: entityType === "order",
    },
    processedAt: null,
    createdAt: new Date().toISOString(),
  };
  const saved = await repository.saveWebhookEvent(event);
  if (saved.id !== event.id) return { idempotent: true, event: saved };
  logAuditEvent({
    request: input.request,
    actorType: "system",
    action: "ginee_webhook_received",
    entityType: "ginee_webhook",
    entityId: saved.id,
    metadata: { eventType, gineeEntityType: entityType, idempotent: false },
  });
  return { idempotent: false, event: saved };
}

export function verifyGineeWebhookSecret(headers: Headers, expectedSecret: string) {
  if (!expectedSecret) return false;
  const received = headers.get("x-ofissio-ginee-webhook-secret") ??
    headers.get("x-ginee-webhook-secret") ??
    headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const left = Buffer.from(received);
  const right = Buffer.from(expectedSecret);
  return left.length === right.length && timingSafeEqual(left, right);
}

function normalizeSku(value: string) {
  const sku = value.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._-]{1,127}$/.test(sku)) {
    throw createApiError("VALIDATION_ERROR", "Format SKU tidak valid.", 400);
  }
  return sku;
}

function assertIdentifier(value: string, label: string) {
  if (!/^[A-Za-z0-9._:-]{2,160}$/.test(value)) {
    throw createApiError("VALIDATION_ERROR", `${label} tidak valid.`, 400);
  }
}

function cleanNullable(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 200) : null;
}

function safeText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 120) : fallback;
}

function safeNullable(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 180) : null;
}
