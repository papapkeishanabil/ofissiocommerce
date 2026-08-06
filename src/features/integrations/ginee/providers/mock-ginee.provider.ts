import type { GineeProviderAdapter } from "../ginee.types";

const now = new Date().toISOString();

const inventory = ["S", "M", "L"].map((size, index) => ({
  stockSku: `KK-006-${size}`,
  gineeProductId: "ginee-product-kk006",
  gineeVariationId: `ginee-variation-kk006-${size.toLowerCase()}`,
  warehouseId: "ginee-warehouse-bandung",
  warehouseName: "Gudang Bandung",
  warehouseStock: 40 - index * 5,
  availableStock: 36 - index * 5,
  reservedStock: 2,
  lockedStock: 2,
  lastSyncedAt: now,
}));

const orders = [
  {
    gineeOrderId: "GINEE-MOCK-ORDER-001",
    channelOrderId: "SHOPEE-MOCK-1001",
    shopId: "GINEE-MOCK-SHOP-001",
    channel: "SHOPEE_ID",
    status: "ready",
    rawStatus: "PAID",
    totalAmount: 450_000,
    currency: "IDR",
    orderCreatedAt: now,
    orderUpdatedAt: now,
    items: [{
      itemId: "GINEE-MOCK-ITEM-001",
      stockSku: "KK-006-M",
      productName: "Kemeja Kantor KK-006",
      quantity: 3,
    }],
  },
];

export const mockGineeProvider: GineeProviderAdapter = {
  async validateConnection() {
    return { ok: true, shops: 1 };
  },
  async listShops() {
    return [{
      shopId: "GINEE-MOCK-SHOP-001",
      channel: "SHOPEE_ID",
      name: "Ofissio Mock Shop",
      authorizationStatus: "CONNECTED",
    }];
  },
  async listOrders() {
    return structuredClone(orders);
  },
  async getOrderDetails(orderId) {
    return structuredClone(orders.find((order) => order.gineeOrderId === orderId) ?? null);
  },
  async getWarehouseInventoryBySku(stockSku) {
    return structuredClone(inventory.filter((item) => item.stockSku === stockSku.trim().toUpperCase()));
  },
  async searchProductOrSku(stockSku) {
    return structuredClone(inventory.filter((item) => item.stockSku === stockSku.trim().toUpperCase()));
  },
};
