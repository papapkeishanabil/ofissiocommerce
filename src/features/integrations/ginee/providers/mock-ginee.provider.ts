import type { GineeInventory, GineeProviderAdapter } from "../ginee.types";

const inventory: GineeInventory[] = [
  stock("S", "bandung", "Gudang Bandung", 36, 40),
  stock("M", "bandung", "Gudang Bandung", 31, 35),
  stock("M", "jakarta", "Gudang Jakarta", 12, 15),
  stock("L", "bandung", "Gudang Bandung", 26, 30),
];

export const mockGineeProvider: GineeProviderAdapter = {
  async validateConnection() {
    return { ok: true };
  },
  async getWarehouseInventoryBySku(stockSku, warehouseId) {
    const sku = stockSku.trim().toUpperCase();
    return structuredClone(inventory.filter((item) =>
      item.stockSku === sku && (!warehouseId || item.warehouseId === warehouseId),
    ));
  },
};

function stock(
  size: string,
  warehouseId: string,
  warehouseName: string,
  availableStock: number,
  warehouseStock: number,
): GineeInventory {
  return {
    stockSku: `KK-006-${size}`,
    warehouseId,
    warehouseName,
    warehouseStock,
    availableStock,
    reservedStock: 2,
    lockedStock: Math.max(0, warehouseStock - availableStock - 2),
    lastCheckedAt: new Date().toISOString(),
  };
}
