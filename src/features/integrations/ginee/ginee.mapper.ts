import type { GineeInventory } from "./ginee.types";

type JsonObject = Record<string, unknown>;

export function mapGineeInventory(payload: unknown, requestedSku: string): GineeInventory[] {
  const normalizedSku = requestedSku.trim().toUpperCase();
  const checkedAt = new Date().toISOString();
  const inventoryRows = rowsFromPayload(payload).flatMap((row) => {
    const variations = arrayValue(row.variationBriefs);
    if (variations.length) {
      return variations.map((value) => ({
        variation: objectValue(value),
        inventory: objectValue(objectValue(value).stock),
        warehouse: objectValue(objectValue(value).warehouse),
      }));
    }

    const warehouseRows = arrayValue(row.warehouseInventories ?? row.warehouseInventoryList);
    if (warehouseRows.length) {
      return warehouseRows.map((value) => ({
        variation: objectValue(row.masterVariation ?? row.variation ?? row),
        inventory: objectValue(value),
        warehouse: objectValue(objectValue(value).warehouse),
      }));
    }

    return [{
      variation: objectValue(row.masterVariation ?? row.variation ?? row),
      inventory: objectValue(row.warehouseInventory ?? row.inventory ?? row),
      warehouse: objectValue(row.warehouse),
    }];
  });

  return inventoryRows.map(({ variation, inventory, warehouse }) => ({
    stockSku: stringValue(variation.sku, variation.masterSku, inventory.masterSku, normalizedSku).toUpperCase(),
    warehouseId: nullableString(inventory.warehouseId, warehouse.id),
    warehouseName: nullableString(inventory.warehouseName, warehouse.name),
    warehouseStock: nonNegativeNumber(inventory.warehouseStock, inventory.stock),
    availableStock: nonNegativeNumber(inventory.availableStock, inventory.available),
    reservedStock: nonNegativeNumber(inventory.spareStock, inventory.reservedStock),
    lockedStock: nonNegativeNumber(inventory.lockedStock),
    lastCheckedAt: checkedAt,
  })).filter((item) => item.stockSku === normalizedSku);
}

function rowsFromPayload(payload: unknown): JsonObject[] {
  if (Array.isArray(payload)) return payload.map(objectValue);
  const object = objectValue(payload);
  for (const key of ["content", "list", "data", "items"]) {
    if (Array.isArray(object[key])) return (object[key] as unknown[]).map(objectValue);
  }
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

function nonNegativeNumber(...values: unknown[]) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return 0;
}
