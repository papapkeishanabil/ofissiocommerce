import type { GineeInventory, GineeOrder, GineeOrderItem, GineeShop } from "./ginee.types";

type JsonObject = Record<string, unknown>;

export function mapGineeShops(payload: unknown): GineeShop[] {
  return rowsFromPayload(payload).map((row) => ({
    shopId: stringValue(row.shopId),
    channel: stringValue(row.channel, "UNKNOWN"),
    name: stringValue(row.name, "Unnamed shop"),
    authorizationStatus: stringValue(row.authorizationStatus, "UNKNOWN"),
  })).filter((shop) => Boolean(shop.shopId));
}

export function mapGineeOrders(payload: unknown): GineeOrder[] {
  return rowsFromPayload(payload).map(mapGineeOrder).filter((order) => Boolean(order.gineeOrderId));
}

export function mapGineeOrder(payload: unknown): GineeOrder {
  const row = objectValue(payload);
  const rawStatus = stringValue(row.orderStatus, row.externalOrderStatus, "UNKNOWN");
  return {
    gineeOrderId: stringValue(row.orderId),
    channelOrderId: nullableString(row.externalOrderSn, row.externalOrderId),
    shopId: nullableString(row.shopId),
    channel: stringValue(row.channel, "UNKNOWN"),
    status: mapGineeOrderStatus(rawStatus),
    rawStatus,
    totalAmount: nonNegativeNumber(row.totalAmount),
    currency: stringValue(row.currency, "IDR"),
    orderCreatedAt: nullableString(row.createAt, row.externalCreateAt),
    orderUpdatedAt: nullableString(row.lastUpdateAt, row.externalUpdateAt),
    items: arrayValue(row.items).map(mapGineeOrderItem).filter((item) => Boolean(item.stockSku)),
  };
}

export function mapGineeInventory(payload: unknown, requestedSku: string): GineeInventory[] {
  const now = new Date().toISOString();
  const rows = rowsFromPayload(payload);
  const inventoryRows = rows.flatMap((row) => {
    if (Array.isArray(row.variationBriefs)) {
      return row.variationBriefs.map((variation) => ({
        product: row,
        variation: objectValue(variation),
        warehouseInventory: objectValue(objectValue(variation).stock),
        warehouse: {} as JsonObject,
      }));
    }
    return [{
      product: {} as JsonObject,
      variation: objectValue(row.masterVariation),
      warehouseInventory: objectValue(row.warehouseInventory),
      warehouse: objectValue(row.warehouse),
    }];
  });

  return inventoryRows.map(({ product, variation, warehouseInventory, warehouse }) => {
    const stockSku = stringValue(variation.sku, variation.masterSku, requestedSku).trim().toUpperCase();
    return {
      stockSku,
      gineeProductId: nullableString(product.productId, variation.masterProductId),
      gineeVariationId: nullableString(variation.id, warehouseInventory.masterVariationId),
      warehouseId: nullableString(warehouseInventory.warehouseId, warehouse.id),
      warehouseName: nullableString(warehouse.name),
      warehouseStock: nonNegativeNumber(warehouseInventory.warehouseStock),
      availableStock: nonNegativeNumber(warehouseInventory.availableStock),
      reservedStock: nonNegativeNumber(warehouseInventory.spareStock),
      lockedStock: nonNegativeNumber(warehouseInventory.lockedStock),
      lastSyncedAt: now,
    } satisfies GineeInventory;
  }).filter((item) => item.stockSku === requestedSku.trim().toUpperCase());
}

export function mapGineeOrderStatus(value: string) {
  const status = value.trim().toUpperCase();
  if (["PAID", "READY_TO_SHIP", "PENDING_SHIPMENT", "SHIPPING"].includes(status)) return "ready";
  if (["COMPLETED", "DELIVERED"].includes(status)) return "completed";
  if (["CANCELLED", "CANCELED", "CLOSED"].includes(status)) return "cancelled";
  if (["UNPAID", "PENDING", "WAITING_PAYMENT"].includes(status)) return "pending";
  return "manual_review";
}

export function sanitizedGineeOrderSnapshot(order: GineeOrder) {
  return {
    gineeOrderId: order.gineeOrderId,
    channelOrderId: order.channelOrderId,
    shopId: order.shopId,
    channel: order.channel,
    status: order.status,
    rawStatus: order.rawStatus,
    totalAmount: order.totalAmount,
    currency: order.currency,
    orderCreatedAt: order.orderCreatedAt,
    orderUpdatedAt: order.orderUpdatedAt,
    items: order.items.map((item) => ({
      itemId: item.itemId,
      stockSku: item.stockSku,
      productName: item.productName.slice(0, 160),
      quantity: item.quantity,
    })),
  };
}

function mapGineeOrderItem(payload: unknown): GineeOrderItem {
  const row = objectValue(payload);
  return {
    itemId: stringValue(row.itemId),
    stockSku: stringValue(row.masterSku, row.sku, row.variationSku).trim().toUpperCase(),
    productName: stringValue(row.productName, row.name, "Ginee item"),
    quantity: Math.max(0, Math.round(nonNegativeNumber(row.quantity, 1))),
  };
}

function rowsFromPayload(payload: unknown): JsonObject[] {
  if (Array.isArray(payload)) return payload.map(objectValue);
  const object = objectValue(payload);
  if (Array.isArray(object.content)) return object.content.map(objectValue);
  if (Array.isArray(object.list)) return object.list.map(objectValue);
  return Object.keys(object).length ? [object] : [];
}

function objectValue(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function stringValue(...values: unknown[]) {
  for (const value of values) if (typeof value === "string" && value.trim()) return value.trim();
  return "";
}

function nullableString(...values: unknown[]) {
  return stringValue(...values) || null;
}

function nonNegativeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
