export type GineeMode = "sandbox" | "live";

export interface GineeRuntimeConfig {
  enabled: boolean;
  mode: GineeMode;
  baseUrl: string;
  country: string;
  accessKey: string;
  secretKey: string;
  testLive: boolean;
  isConfigured: boolean;
  useLiveProvider: boolean;
}

export interface GineeInventory {
  stockSku: string;
  warehouseId: string | null;
  warehouseName: string | null;
  warehouseStock: number;
  availableStock: number;
  reservedStock: number;
  lockedStock: number;
  lastCheckedAt: string;
}

export interface GineeProductMapping {
  id: string;
  parentSku: string;
  stockSku: string;
  sizeLabel: string | null;
  colorLabel: string | null;
  woocommerceProductId: string | null;
  woocommerceVariationId: string | null;
  gineeSku: string;
  gineeWarehouseId: string | null;
  lastStock: number | null;
  lastCheckedAt: string | null;
  syncStockEnabled: false;
  createdAt: string;
  updatedAt: string;
}

export interface GineeInventorySnapshot {
  id: string;
  mappingId: string | null;
  stockSku: string;
  gineeSku: string;
  gineeWarehouseId: string | null;
  warehouseName: string | null;
  warehouseStock: number;
  availableStock: number;
  reservedStock: number;
  lockedStock: number;
  checkedAt: string;
  createdAt: string;
}

export interface GineeProviderAdapter {
  validateConnection(): Promise<{ ok: boolean }>;
  getWarehouseInventoryBySku(stockSku: string, warehouseId?: string | null): Promise<GineeInventory[]>;
}

export interface GineeRepository {
  listMappings(): Promise<GineeProductMapping[]>;
  upsertMapping(mapping: GineeProductMapping): Promise<GineeProductMapping>;
  getMappingByStockSku(stockSku: string): Promise<GineeProductMapping | null>;
  updateMappingStock(input: { mappingId: string; lastStock: number; lastCheckedAt: string }): Promise<GineeProductMapping | null>;
  saveInventorySnapshots(snapshots: GineeInventorySnapshot[]): Promise<GineeInventorySnapshot[]>;
  listInventorySnapshots(limit?: number): Promise<GineeInventorySnapshot[]>;
}
