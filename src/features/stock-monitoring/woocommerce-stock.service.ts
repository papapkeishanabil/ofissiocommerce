import "server-only";

import { woocommerceClient } from "@/features/products/woocommerce/woocommerce.client";
import type {
  WooCommerceProduct,
  WooCommerceProductVariation,
} from "@/features/products/woocommerce/woocommerce.types";

import { getStockMonitoringConfig } from "./stock-monitoring.config";
import type {
  OrderStockComparison,
  OrderStockComparisonResult,
  OrderStockRequirement,
  OrderWithStockItems,
  StockMonitoringStatus,
  WooSizeStockMatrix,
  WooStockDataSource,
  WooStockItem,
} from "./stock-monitoring.types";

const PAGE_SIZE = 100;
const MAX_VARIATION_PAGES = 20;

export async function getWooStockBySku(
  stockSku: string,
  source: WooStockDataSource = woocommerceClient,
): Promise<WooStockItem | null> {
  const normalizedSku = normalizeSku(stockSku);
  if (!normalizedSku) return null;

  const parentSku = inferParentSku(normalizedSku);
  if (parentSku !== normalizedSku) {
    const rows = await getWooStockByParentSku(parentSku, source);
    const variation = rows.find((row) => normalizeSku(row.stockSku) === normalizedSku);
    if (variation) return variation;
  }

  const direct = await findProductBySku(normalizedSku, source);
  return direct ? mapParentStock(direct, new Date().toISOString()) : null;
}

export async function getWooStockByParentSku(
  parentSku: string,
  source: WooStockDataSource = woocommerceClient,
): Promise<WooStockItem[]> {
  return (await readParentStock(parentSku, source)).rows;
}

export async function getWooSizeStockMatrix(
  parentSku: string,
  source: WooStockDataSource = woocommerceClient,
): Promise<WooSizeStockMatrix> {
  const config = getStockMonitoringConfig();
  const normalizedParent = normalizeSku(parentSku);
  const checkedAt = new Date().toISOString();
  if (!config.enabled) return emptyMatrix(normalizedParent, checkedAt, false);

  const result = await readParentStock(normalizedParent, source, checkedAt);
  return {
    enabled: true,
    source: "woocommerce",
    parentSku: normalizedParent,
    productId: result.product?.id ?? null,
    productName: result.product?.name ?? null,
    rows: result.rows.sort(compareStockRows),
    hasVariationSkuWarning:
      result.product == null ||
      (result.variations.length > 0 &&
        result.rows.some((row) => !row.variationSkuConfigured)) ||
      (hasSizeOptions(result.product) && result.variations.length === 0),
    lastCheckedAt: checkedAt,
  };
}

export function getOrderStockRequirement(
  order: OrderWithStockItems,
): OrderStockRequirement[] {
  const grouped = new Map<string, OrderStockRequirement>();

  for (const item of order.items) {
    if (item.source === "custom") continue;
    const parentSku = normalizeSku(item.sku);
    if (!parentSku) continue;
    const sizeEntries = Object.entries(item.sizeMatrix ?? {}).filter(
      ([, quantity]) => positiveInteger(quantity) > 0,
    );
    const requirements = sizeEntries.length
      ? sizeEntries.map(([sizeLabel, quantity]) => ({
          sizeLabel: normalizeSize(sizeLabel),
          quantity: positiveInteger(quantity),
        }))
      : [{ sizeLabel: null, quantity: positiveInteger(item.totalQty) }];

    for (const requirement of requirements) {
      if (requirement.quantity <= 0) continue;
      const stockSku = requirement.sizeLabel
        ? `${parentSku}-${requirement.sizeLabel}`
        : parentSku;
      const key = `${item.productId}|${stockSku}`;
      const current = grouped.get(key);
      grouped.set(key, {
        orderId: order.id,
        companyId: order.companyId,
        productId: item.productId,
        productName: item.productName,
        parentSku,
        stockSku,
        sizeLabel: requirement.sizeLabel,
        requiredQty: (current?.requiredQty ?? 0) + requirement.quantity,
      });
    }
  }

  return [...grouped.values()].sort((left, right) =>
    left.parentSku.localeCompare(right.parentSku) ||
    compareSize(left.sizeLabel, right.sizeLabel),
  );
}

export async function compareOrderRequirementWithWooStock(
  order: OrderWithStockItems,
  source: WooStockDataSource = woocommerceClient,
): Promise<OrderStockComparisonResult> {
  const config = getStockMonitoringConfig();
  const checkedAt = new Date().toISOString();
  const requirements = getOrderStockRequirement(order);
  if (!config.enabled) {
    return {
      enabled: false,
      source: "woocommerce",
      orderId: order.id,
      requirements: requirements.map((requirement) =>
        comparisonWithoutStock(requirement, config.defaultMinimumQty, checkedAt),
      ),
      hasShortage: false,
      hasLowStock: false,
      hasUnsyncedSku: requirements.length > 0,
      lastCheckedAt: checkedAt,
    };
  }

  const parentSkus = [...new Set(requirements.map((item) => item.parentSku))];
  const matrices = await Promise.all(
    parentSkus.map((parentSku) => getWooSizeStockMatrix(parentSku, source)),
  );
  const stockBySku = new Map(
    matrices.flatMap((matrix) => matrix.rows).map((row) => [normalizeSku(row.stockSku), row]),
  );
  const comparisons = requirements.map((requirement): OrderStockComparison => {
    const stock = stockBySku.get(normalizeSku(requirement.stockSku));
    if (!stock || stock.stockQuantity == null || !stock.variationSkuConfigured) {
      return comparisonWithoutStock(requirement, config.defaultMinimumQty, checkedAt);
    }
    const shortageQty = Math.max(0, requirement.requiredQty - stock.stockQuantity);
    const monitoringStatus: StockMonitoringStatus = shortageQty > 0
      ? "production_needed"
      : stock.stockQuantity < stock.minimumThreshold
        ? "low"
        : "safe";
    return {
      ...requirement,
      availableQty: stock.stockQuantity,
      shortageQty,
      minimumThreshold: stock.minimumThreshold,
      manageStock: stock.manageStock,
      stockStatus: stock.stockStatus,
      monitoringStatus,
      lastCheckedAt: stock.lastCheckedAt,
    };
  });

  return {
    enabled: true,
    source: "woocommerce",
    orderId: order.id,
    requirements: comparisons,
    hasShortage: comparisons.some((item) => (item.shortageQty ?? 0) > 0),
    hasLowStock: comparisons.some((item) => item.monitoringStatus === "low"),
    hasUnsyncedSku: comparisons.some((item) => item.monitoringStatus === "not_synced"),
    lastCheckedAt: checkedAt,
  };
}

async function readParentStock(
  parentSku: string,
  source: WooStockDataSource,
  checkedAt = new Date().toISOString(),
) {
  const normalizedParent = normalizeSku(parentSku);
  const product = await findProductBySku(normalizedParent, source);
  if (!product) return { product: null, variations: [], rows: [] };

  const variations = await listAllVariations(product.id, source);
  const rows = variations.length
    ? variations.map((variation) => mapVariationStock(product, variation, checkedAt))
    : [mapParentStock(product, checkedAt)];
  return { product, variations, rows };
}

async function findProductBySku(sku: string, source: WooStockDataSource) {
  const exact = await source.getProducts({ status: "any", sku, per_page: 20 });
  const matched = exact.find((product) => normalizeSku(product.sku) === sku);
  if (matched) return matched;
  const searched = await source.getProducts({ status: "any", search: sku, per_page: 100 });
  return searched.find((product) => normalizeSku(product.sku) === sku) ?? null;
}

async function listAllVariations(productId: number, source: WooStockDataSource) {
  const rows: WooCommerceProductVariation[] = [];
  for (let page = 1; page <= MAX_VARIATION_PAGES; page += 1) {
    const batch = await source.getProductVariations(productId, {
      page,
      per_page: PAGE_SIZE,
    });
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
}

function mapVariationStock(
  parent: WooCommerceProduct,
  variation: WooCommerceProductVariation,
  checkedAt: string,
): WooStockItem {
  const config = getStockMonitoringConfig();
  const parentSku = normalizeSku(parent.sku);
  const sizeLabel = variationSize(variation, parentSku);
  const configuredSku = normalizeSku(variation.sku);
  const stockSku = configuredSku || [parentSku, sizeLabel].filter(Boolean).join("-");
  return stockItem({
    parentSku,
    stockSku,
    sizeLabel,
    productId: parent.id,
    variationId: variation.id,
    manageStock: variation.manage_stock === true,
    quantity: finiteStock(variation.stock_quantity),
    stockStatus: variation.stock_status,
    threshold: finiteThreshold(variation.low_stock_amount, config.defaultMinimumQty),
    variationSkuConfigured: Boolean(configuredSku),
    checkedAt,
  });
}

function mapParentStock(parent: WooCommerceProduct, checkedAt: string): WooStockItem {
  const config = getStockMonitoringConfig();
  const parentSku = normalizeSku(parent.sku);
  return stockItem({
    parentSku,
    stockSku: parentSku,
    sizeLabel: null,
    productId: parent.id,
    variationId: null,
    manageStock: parent.manage_stock === true,
    quantity: finiteStock(parent.stock_quantity),
    stockStatus: parent.stock_status,
    threshold: finiteThreshold(parent.low_stock_amount, config.defaultMinimumQty),
    variationSkuConfigured: Boolean(parentSku),
    checkedAt,
  });
}

function stockItem(input: {
  parentSku: string;
  stockSku: string;
  sizeLabel: string | null;
  productId: number;
  variationId: number | null;
  manageStock: boolean;
  quantity: number | null;
  stockStatus?: string;
  threshold: number;
  variationSkuConfigured: boolean;
  checkedAt: string;
}): WooStockItem {
  const synchronized =
    input.variationSkuConfigured && input.manageStock && input.quantity != null;
  const shortageToMinimum = synchronized
    ? Math.max(0, input.threshold - (input.quantity ?? 0))
    : null;
  const status: StockMonitoringStatus = !synchronized
    ? "not_synced"
    : (input.quantity ?? 0) <= 0 || input.stockStatus === "outofstock"
      ? "production_needed"
      : (input.quantity ?? 0) < input.threshold
        ? "low"
        : "safe";
  return {
    parentSku: input.parentSku,
    stockSku: input.stockSku,
    sizeLabel: input.sizeLabel,
    wooCommerceProductId: input.productId,
    wooCommerceVariationId: input.variationId,
    manageStock: input.manageStock,
    stockQuantity: input.quantity,
    stockStatus: input.stockStatus || "unknown",
    minimumThreshold: input.threshold,
    shortageToMinimum,
    status,
    variationSkuConfigured: input.variationSkuConfigured,
    lastCheckedAt: input.checkedAt,
  };
}

function comparisonWithoutStock(
  requirement: OrderStockRequirement,
  threshold: number,
  checkedAt: string,
): OrderStockComparison {
  return {
    ...requirement,
    availableQty: null,
    shortageQty: null,
    minimumThreshold: threshold,
    manageStock: false,
    stockStatus: "unknown",
    monitoringStatus: "not_synced",
    lastCheckedAt: checkedAt,
  };
}

function emptyMatrix(parentSku: string, checkedAt: string, enabled: boolean): WooSizeStockMatrix {
  return {
    enabled,
    source: "woocommerce",
    parentSku,
    productId: null,
    productName: null,
    rows: [],
    hasVariationSkuWarning: false,
    lastCheckedAt: checkedAt,
  };
}

function hasSizeOptions(product: WooCommerceProduct | null) {
  return Boolean(product?.attributes?.some((attribute) => {
    const key = `${attribute.name} ${attribute.slug ?? ""}`.toLowerCase();
    return /(size|ukuran)/.test(key) && (attribute.options?.length ?? 0) > 0;
  }));
}

function variationSize(variation: WooCommerceProductVariation, parentSku: string) {
  const attribute = variation.attributes?.find((item) =>
    /(size|ukuran)/i.test(`${item.name ?? ""}`),
  );
  if (attribute?.option) return normalizeSize(attribute.option);
  const sku = normalizeSku(variation.sku);
  return sku.startsWith(`${parentSku}-`)
    ? normalizeSize(sku.slice(parentSku.length + 1))
    : null;
}

export function normalizeStockSku(value: string) {
  return normalizeSku(value);
}

function normalizeSku(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "-");
}

function normalizeSize(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "-") || null;
}

function inferParentSku(stockSku: string) {
  const parts = stockSku.split("-");
  const suffix = parts.at(-1) ?? "";
  return parts.length > 1 && SIZE_ORDER.includes(suffix)
    ? parts.slice(0, -1).join("-")
    : stockSku;
}

function finiteStock(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null;
}

function finiteThreshold(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function positiveInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

function compareSize(left: string | null, right: string | null) {
  const leftIndex = left ? SIZE_ORDER.indexOf(left) : -1;
  const rightIndex = right ? SIZE_ORDER.indexOf(right) : -1;
  if (leftIndex >= 0 || rightIndex >= 0) {
    return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) -
      (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
  }
  return (left ?? "").localeCompare(right ?? "");
}

function compareStockRows(left: WooStockItem, right: WooStockItem) {
  return compareSize(left.sizeLabel, right.sizeLabel) || left.stockSku.localeCompare(right.stockSku);
}
