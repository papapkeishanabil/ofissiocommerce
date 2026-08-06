import "server-only";

import { gineeReadRequest } from "../ginee.client";
import { mapGineeInventory, mapGineeOrder, mapGineeOrders, mapGineeShops } from "../ginee.mapper";
import type { GineeProviderAdapter } from "../ginee.types";

export const liveGineeProvider: GineeProviderAdapter = {
  async validateConnection() {
    const shops = await this.listShops();
    return { ok: true, shops: shops.length };
  },

  async listShops() {
    const data = await gineeReadRequest<unknown>({
      method: "POST",
      requestUri: "/openapi/shop/v1/list",
      body: { page: 0, size: 100 },
    });
    return mapGineeShops(data);
  },

  async listOrders(input = {}) {
    const updatedTo = input.updatedTo ?? new Date().toISOString();
    const updatedSince = input.updatedSince ?? new Date(Date.now() - 7 * 86_400_000).toISOString();
    const data = await gineeReadRequest<unknown>({
      method: "POST",
      requestUri: "/openapi/order/v2/list-order",
      body: { size: 100, lastUpdateSince: updatedSince, lastUpdateTo: updatedTo },
    });
    return mapGineeOrders(data);
  },

  async getOrderDetails(orderId) {
    const data = await gineeReadRequest<unknown>({
      method: "POST",
      requestUri: "/openapi/order/v2/get",
      body: { orderId },
    });
    const order = mapGineeOrder(data);
    return order.gineeOrderId ? order : null;
  },

  async getWarehouseInventoryBySku(stockSku, warehouseId) {
    const normalizedSku = stockSku.trim().toUpperCase();
    if (warehouseId) {
      const data = await gineeReadRequest<unknown>({
        method: "POST",
        requestUri: "/openapi/warehouse-inventory/v1/sku/list",
        body: { page: 0, size: 50, warehouseId, masterSkuList: [normalizedSku] },
      });
      return mapGineeInventory(data, normalizedSku);
    }
    return this.searchProductOrSku(normalizedSku);
  },

  async searchProductOrSku(stockSku) {
    const normalizedSku = stockSku.trim().toUpperCase();
    const data = await gineeReadRequest<unknown>({
      method: "POST",
      requestUri: "/openapi/product/master/v1/list",
      body: { page: 0, size: 50, sku: normalizedSku },
    });
    return mapGineeInventory(data, normalizedSku);
  },
};
