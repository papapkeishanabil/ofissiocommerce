import "server-only";

import { randomUUID } from "node:crypto";

import { createApiError, logInternalError } from "@/lib/security/safe-error-response";

import { getGineeConfig, validateGineeConfig } from "./ginee.config";
import { getGineeRepository } from "./ginee.repository";
import type {
  GineeInventorySnapshot,
  GineeProductMapping,
  GineeProviderAdapter,
  GineeRepository,
} from "./ginee.types";
import { liveGineeProvider } from "./providers/ginee.provider";
import { mockGineeProvider } from "./providers/mock-ginee.provider";

export function getGineeProvider(): GineeProviderAdapter {
  return getGineeConfig().useLiveProvider ? liveGineeProvider : mockGineeProvider;
}

export async function getGineeHealth(provider = getGineeProvider()) {
  const config = getGineeConfig();
  const configErrors = validateGineeConfig(config);
  const connection = await provider.validateConnection();
  return {
    enabled: config.enabled,
    configured: config.isConfigured,
    mode: config.mode,
    providerMode: config.useLiveProvider ? "live_inventory_read_only" : "mock_inventory_read_only",
    testLive: config.testLive,
    connectionOk: connection.ok,
    configErrors,
    capability: "inventory_read_only",
    orderImportEnabled: false,
    stockWriteEnabled: false,
    checkedAt: new Date().toISOString(),
  } as const;
}

export async function checkGineeStock(input: {
  stockSku: string;
  provider?: GineeProviderAdapter;
  repository?: GineeRepository;
}) {
  const stockSku = normalizeSku(input.stockSku);
  const repository = input.repository ?? getGineeRepository();
  const mapping = await repository.getMappingByStockSku(stockSku).catch(() => null);
  const gineeSku = mapping?.gineeSku ?? stockSku;
  const inventory = await (input.provider ?? getGineeProvider()).getWarehouseInventoryBySku(
    gineeSku,
    mapping?.gineeWarehouseId,
  );
  const checkedAt = new Date().toISOString();
  const lastStock = inventory.reduce((total, row) => total + row.availableStock, 0);
  const snapshots: GineeInventorySnapshot[] = inventory.map((row) => ({
    id: randomUUID(),
    mappingId: mapping?.id ?? null,
    stockSku,
    gineeSku,
    gineeWarehouseId: row.warehouseId,
    warehouseName: row.warehouseName,
    warehouseStock: row.warehouseStock,
    availableStock: row.availableStock,
    reservedStock: row.reservedStock,
    lockedStock: row.lockedStock,
    checkedAt,
    createdAt: checkedAt,
  }));

  if (snapshots.length) {
    try {
      await repository.saveInventorySnapshots(snapshots);
    } catch (error) {
      logInternalError(error, { area: "ginee", operation: "save_inventory_snapshot" });
    }
  }

  const updatedMapping = mapping
    ? await repository.updateMappingStock({
      mappingId: mapping.id,
      lastStock,
      lastCheckedAt: checkedAt,
    }).catch(() => null)
    : null;

  return {
    stockSku,
    gineeSku,
    mapped: Boolean(mapping),
    mapping: updatedMapping ?? mapping,
    inventory,
    lastStock,
    lastCheckedAt: checkedAt,
    unmappedSkus: mapping ? [] : [stockSku],
  };
}

export const pullInventoryByStockSku = checkGineeStock;

export async function listGineeInventoryOverview(repository = getGineeRepository()) {
  const [mappings, snapshots] = await Promise.all([
    repository.listMappings(),
    repository.listInventorySnapshots(150),
  ]);
  const mappedStockSkus = new Set(mappings.map((item) => item.stockSku));
  return {
    mappings,
    snapshots,
    unmappedSkus: [...new Set(
      snapshots.map((item) => item.stockSku).filter((sku) => !mappedStockSkus.has(sku)),
    )],
  };
}

export function detectUnmappedGineeSku(gineeSkus: string[], mappings: GineeProductMapping[]) {
  const mapped = new Set(mappings.map((item) => item.gineeSku));
  return [...new Set(gineeSkus.map(normalizeSku))].filter((sku) => !mapped.has(sku));
}

export function detectUnmappedStockSku(stockSkus: string[], mappings: GineeProductMapping[]) {
  const mapped = new Set(mappings.map((item) => item.stockSku));
  return [...new Set(stockSkus.map(normalizeSku))].filter((sku) => !mapped.has(sku));
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
  return repository.upsertMapping({
    id: input.id || randomUUID(),
    parentSku,
    stockSku,
    sizeLabel: cleanNullable(input.sizeLabel),
    colorLabel: cleanNullable(input.colorLabel),
    woocommerceProductId: cleanNullable(input.woocommerceProductId),
    woocommerceVariationId: cleanNullable(input.woocommerceVariationId),
    gineeSku,
    gineeWarehouseId: cleanNullable(input.gineeWarehouseId),
    lastStock: input.lastStock ?? null,
    lastCheckedAt: input.lastCheckedAt ?? null,
    syncStockEnabled: false,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  });
}

function normalizeSku(value: string) {
  const sku = value.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._-]{1,127}$/.test(sku)) {
    throw createApiError("VALIDATION_ERROR", "Format SKU tidak valid.", 400);
  }
  return sku;
}

function cleanNullable(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 200) : null;
}
