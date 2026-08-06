import "server-only";

import { gineeReadRequest } from "../ginee.client";
import { mapGineeInventory } from "../ginee.mapper";
import type { GineeProviderAdapter } from "../ginee.types";

const HEALTH_CHECK_SKU = "OFISSIO-CONNECTION-CHECK";

export const liveGineeProvider: GineeProviderAdapter = {
  async validateConnection() {
    await requestInventory(HEALTH_CHECK_SKU, null);
    return { ok: true };
  },

  async getWarehouseInventoryBySku(stockSku, warehouseId) {
    const normalizedSku = stockSku.trim().toUpperCase();
    const data = await requestInventory(normalizedSku, warehouseId ?? null);
    return mapGineeInventory(data, normalizedSku);
  },
};

async function requestInventory(stockSku: string, warehouseId: string | null) {
  return gineeReadRequest<unknown>({
    method: "POST",
    requestUri: "/openapi/warehouse-inventory/v1/sku/list",
    body: {
      page: 0,
      size: 100,
      masterSkuList: [stockSku],
      ...(warehouseId ? { warehouseId } : {}),
    },
  });
}
