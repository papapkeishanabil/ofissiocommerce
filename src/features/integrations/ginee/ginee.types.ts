export type GineeMode = "sandbox" | "live";

export interface GineeRuntimeConfig {
  enabled: boolean;
  mode: GineeMode;
  baseUrl: string;
  country: string;
  accessKey: string;
  secretKey: string;
  webhookSecret: string;
  webhookUrl: string;
  testLive: boolean;
  syncOrders: boolean;
  syncInventory: boolean;
  isConfigured: boolean;
  useLiveProvider: boolean;
}

export interface GineeShop {
  shopId: string;
  channel: string;
  name: string;
  authorizationStatus: string;
}

export interface GineeOrderItem {
  itemId: string;
  stockSku: string;
  productName: string;
  quantity: number;
}

export interface GineeOrder {
  gineeOrderId: string;
  channelOrderId: string | null;
  shopId: string | null;
  channel: string;
  status: string;
  rawStatus: string;
  totalAmount: number;
  currency: string;
  orderCreatedAt: string | null;
  orderUpdatedAt: string | null;
  items: GineeOrderItem[];
}

export interface GineeInventory {
  stockSku: string;
  gineeProductId: string | null;
  gineeVariationId: string | null;
  warehouseId: string | null;
  warehouseName: string | null;
  warehouseStock: number;
  availableStock: number;
  reservedStock: number;
  lockedStock: number;
  lastSyncedAt: string;
}

export interface GineeProductMapping {
  id: string;
  companyId: string | null;
  ofissioProductId: string | null;
  woocommerceProductId: string | null;
  woocommerceVariationId: string | null;
  parentSku: string;
  stockSku: string;
  sizeLabel: string | null;
  colorLabel: string | null;
  gineeProductId: string | null;
  gineeVariationId: string | null;
  gineeMasterProductId: string | null;
  gineeSku: string;
  gineeWarehouseId: string | null;
  syncStockEnabled: boolean;
  syncOrderEnabled: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GineeOrderSnapshot {
  id: string;
  gineeOrderId: string;
  channelOrderId: string | null;
  shopId: string | null;
  status: string | null;
  rawStatus: string | null;
  orderCreatedAt: string | null;
  orderUpdatedAt: string | null;
  mappedStatus: string | null;
  unmappedSkus: string[];
  sanitizedSnapshot: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface GineeWebhookEvent {
  id: string;
  eventId: string | null;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  status: string;
  idempotencyKey: string;
  sanitizedPayload: Record<string, unknown>;
  processedAt: string | null;
  createdAt: string;
}

export interface GineeProviderAdapter {
  validateConnection(): Promise<{ ok: boolean; shops: number }>;
  listShops(): Promise<GineeShop[]>;
  listOrders(input?: { updatedSince?: string; updatedTo?: string }): Promise<GineeOrder[]>;
  getOrderDetails(orderId: string): Promise<GineeOrder | null>;
  getWarehouseInventoryBySku(stockSku: string, warehouseId?: string | null): Promise<GineeInventory[]>;
  searchProductOrSku(stockSku: string): Promise<GineeInventory[]>;
}

export interface GineeRepository {
  listMappings(): Promise<GineeProductMapping[]>;
  upsertMapping(mapping: GineeProductMapping): Promise<GineeProductMapping>;
  getMappingByStockSku(stockSku: string): Promise<GineeProductMapping | null>;
  findOrderSnapshot(input: { gineeOrderId: string; channelOrderId?: string | null }): Promise<GineeOrderSnapshot | null>;
  saveOrderSnapshot(snapshot: GineeOrderSnapshot): Promise<GineeOrderSnapshot>;
  findWebhookByKey(idempotencyKey: string): Promise<GineeWebhookEvent | null>;
  saveWebhookEvent(event: GineeWebhookEvent): Promise<GineeWebhookEvent>;
  listWebhookEvents(limit?: number): Promise<GineeWebhookEvent[]>;
}
