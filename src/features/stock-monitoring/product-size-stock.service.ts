import "server-only";
import { matchingProductVariant } from "@/features/products/product-variants";
import { matchingPurchaseVariant, sleeveOptions } from "@/features/products/purchase-variants";

import { selectedColorVariant } from "@/features/products/color-variants";
import type { OfissioProduct } from "@/features/products/product.types";
import { woocommerceClient } from "@/features/products/woocommerce/woocommerce.client";
import { listColorVariationRows } from "@/features/products/woocommerce/color-variants.service";
import { getGineeConfig } from "@/features/integrations/ginee/ginee.config";
import { getGineeRepository } from "@/features/integrations/ginee/ginee.repository";
import { liveGineeProvider } from "@/features/integrations/ginee/providers/ginee.provider";
import { createApiError } from "@/lib/security/safe-error-response";
import { sizeStockSku, type ProductSizeStock } from "./product-size-stock.types";

const normalizeSku = (value: string) => value.trim().toUpperCase().replace(/\s+/g, "-");

export async function readGineeSizeStock(stockSku: string): Promise<number | null> {
  const mapping = await getGineeRepository().getMappingByStockSku(stockSku);
  const gineeSku = normalizeSku(mapping?.gineeSku || stockSku);
  const inventory = await liveGineeProvider.getWarehouseInventoryBySku(gineeSku, mapping?.gineeWarehouseId);
  const matching = inventory.filter(row => normalizeSku(row.stockSku) === gineeSku);
  if (!matching.length || matching.some(row => !Number.isFinite(row.availableStock) || row.availableStock < 0)) return null;
  return Math.floor(matching.reduce((total, row) => total + row.availableStock, 0));
}

async function readWooSizeStock(product: OfissioProduct) {
  if (product.source !== "woocommerce") return [];
  if (product.productKind === "simple") { const row = await woocommerceClient.getProductById(product.source_id); return [{ ...row, status: "publish" }]; }
  return listColorVariationRows(Number(product.source_id), woocommerceClient);
}

export async function getProductSizeStock(product: OfissioProduct, color: string, dependencies = {
  useGinee: () => getGineeConfig().useLiveProvider,
  readGinee: readGineeSizeStock,
  readWoo: readWooSizeStock,
}, sleeve?: string, selection?: Record<string, string>): Promise<ProductSizeStock> {
  if (!product.productKind && sleeveOptions(product).length && !sleeveOptions(product).includes(sleeve || "")) throw createApiError("VALIDATION_ERROR", "Pilih jenis lengan yang tersedia.", 400);
  const selectedColor = product.available_colors.find(value => value.trim().toLowerCase() === color.trim().toLowerCase());
  if (!selectedColor) throw createApiError("VALIDATION_ERROR", "Warna produk tidak tersedia.", 400);
  const variant = selectedColorVariant(product, selectedColor);
  const variantReady = (!product.colorVariantsEnabled || (product.colorVariantsReady && !!variant)) && (product.productKind !== "variable" || product.stockVariantsReady === true);
  const baseSku = variant?.sku || product.sku;
  const rows = [...new Set(product.available_sizes)].map(size => ({ size,
    sku: product.productKind === "simple" ? product.sku : product.productKind === "variable" ? matchingProductVariant(product, selection ?? {}, size)?.sku ?? "" : product.colorSizeVariants?.find(row => row.color.trim().toLowerCase() === selectedColor.trim().toLowerCase() && sizeStockSku("size", row.size) === sizeStockSku("size", size))?.sku ?? matchingPurchaseVariant(product, size, sleeve, selectedColor)?.sku ?? sizeStockSku(baseSku, size),
    availableQty: null as number | null }));
  const useGinee = dependencies.useGinee();
  if (variantReady && useGinee) {
    // A missing/failed SKU stays unknown; never substitute another color or size.
    // Limit concurrent provider requests for products with many sizes.
    for (let offset = 0; offset < rows.length; offset += 3) {
      await Promise.all(rows.slice(offset, offset + 3).map(async row => {
        try { if (row.sku) row.availableQty = await dependencies.readGinee(row.sku); } catch { row.availableQty = null; }
      }));
    }
  } else if (variantReady) {
    const native = await dependencies.readWoo(product).catch(() => []);
    for (const row of rows) {
      const match = native.find(item => item.status === "publish" && normalizeSku(item.sku) === normalizeSku(row.sku));
      if (match?.manage_stock && typeof match.stock_quantity === "number" && Number.isFinite(match.stock_quantity)) {
        row.availableQty = match.stock_status === "outofstock" ? 0 : Math.max(0, Math.floor(match.stock_quantity));
      }
    }
  }
  return { color: selectedColor, source: useGinee ? "ginee" : "woocommerce", checkedAt: new Date().toISOString(), rows };
}
