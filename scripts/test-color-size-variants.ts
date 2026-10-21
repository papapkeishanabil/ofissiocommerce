import assert from "node:assert/strict";
import { saveColorSizeVariants } from "../src/features/products/woocommerce/color-size-variants.service";
import { saveColorVariants, withLiveColorVariants, type VariantSource } from "../src/features/products/woocommerce/color-variants.service";
import { colorVariantSnapshot, mapNativeColorVariants } from "../src/features/products/color-variants";
import { selectColorSizeVariants } from "../src/features/products/color-size-variants";
import { mapWooCommerceProductToOfissioProduct } from "../src/features/products/product.mapper";
import { splitOrderSizeVariants } from "../src/features/orders/order-size-variants";
import { mapPaymentOrderToWooCommerceOrder } from "../src/features/orders/order.mapper";
import type { PaymentOrderRecord, PaymentRecord } from "../src/features/payment/payment.types";
import { getOrderStockRequirement } from "../src/features/stock-monitoring/woocommerce-stock.service";
import { getProductSizeStock } from "../src/features/stock-monitoring/product-size-stock.service";
import type { WooCommerceProduct, WooCommerceProductVariation } from "../src/features/products/woocommerce/woocommerce.types";
import type { ValidatedCheckoutCartItem } from "../src/features/checkout/checkout-cart.types";

async function main() {
  let product = { id: 900, name: "FRM", sku: "FRM", type: "variable", regular_price: "125000", status: "publish", images: [{ id: 1, src: "https://woo.ofissio.com/white.webp" }, { id: 2, src: "https://woo.ofissio.com/black.webp" }], attributes: [{ id: 1, name: "Warna", slug: "pa_warna", options: ["Putih", "Hitam"] }, { id: 2, name: "Ukuran", slug: "pa_ukuran", options: ["S", "M", "2XL"] }], meta_data: [{ key: "available_colors", value: '["Putih","Hitam"]' }, { key: "available_sizes", value: '["S","M","2XL"]' }, { key: "ofissio_color_variants_enabled", value: true }] } as unknown as WooCommerceProduct;
  let id = 100;
  const rows: WooCommerceProductVariation[] = [{ id: 90, sku: "FRM-Putih", status: "publish", attributes: [{ id: 1, name: "Warna", option: "Putih" }], meta_data: [{ key: "ofissio_color_variant", value: true }] }] as WooCommerceProductVariation[];
  let failSku = "FRM-HITAM-M";
  const source = {
    getProductById: async () => structuredClone(product),
    getProductVariations: async (_id: number, params?: { page?: number; per_page?: number }) => structuredClone(rows.slice(((params?.page ?? 1) - 1) * (params?.per_page ?? 100), (params?.page ?? 1) * (params?.per_page ?? 100))),
    updateProduct: async (_id: number, patch: Partial<WooCommerceProduct>) => { product = { ...product, ...patch, attributes: patch.attributes?.map(a => ({ ...product.attributes!.find(old => old.id === a.id), ...a })) ?? product.attributes, meta_data: [...product.meta_data!.filter(m => !patch.meta_data?.some(n => n.key === m.key)), ...(patch.meta_data ?? [])] }; return structuredClone(product); },
    createProductVariation: async (_id: number, patch: Partial<WooCommerceProductVariation>) => {
      if (patch.sku === failSku) throw Error("Fixture failure");
      const row = { ...patch, id: ++id, image: product.images!.find(image => image.id === patch.image?.id), attributes: patch.attributes?.map(a => ({ ...a, name: a.id === 1 ? "Warna" : "Ukuran" })) } as WooCommerceProductVariation;
      rows.push(row);return structuredClone(row);
    },
    updateProductVariation: async (_id: number, rowId: number, patch: Partial<WooCommerceProductVariation>) => { const i = rows.findIndex(row => row.id === rowId); rows[i] = { ...rows[i]!, ...patch, image: patch.image ? product.images!.find(image => image.id === patch.image?.id) as typeof rows[number]["image"] : rows[i]!.image, meta_data: [...(rows[i]!.meta_data ?? []).filter(m => !patch.meta_data?.some(n => n.key === m.key)), ...(patch.meta_data ?? [])] };return structuredClone(rows[i]!); },
  } as unknown as VariantSource;
  const input = { defaultColor: "Putih", variants: [
    { id: 90, color: "Putih", sku: "FRM-Putih", imageSrc: "https://woo.ofissio.com/white.webp", stockQuantity: null },
    { color: "Hitam", sku: "FRM-Hitam", imageSrc: "https://woo.ofissio.com/black.webp", stockQuantity: null },
  ] };
  await assert.rejects(saveColorSizeVariants(product, input, source), /Fixture failure/);
  assert.equal(product.meta_data!.find(m => m.key === "ofissio_color_variants_ready")?.value, false);
  failSku = "";
  await saveColorSizeVariants(product, input, source);
  assert.equal(rows.filter(row => row.status === "publish").length, 6);
  assert.equal(rows.find(row => row.id === 90)?.status, "private", "historical color ID retained");
  assert.equal(new Set(rows.map(row => row.sku)).size, rows.length, "retry does not duplicate stock SKUs");
  assert(rows.some(row => row.sku === "FRM-HITAM-XXL"));
  const stocked = rows.find(row => row.sku === "FRM-HITAM-XXL")!;
  stocked.manage_stock = true;stocked.stock_quantity = 17;
  const mappedColors = mapNativeColorVariants(product, rows);
  assert.equal(mappedColors.length, 2);
  await saveColorVariants(900, { ...input, variants: mappedColors }, source);
  assert.equal(rows.find(row => row.id === stocked.id)?.stock_quantity, 17, "photo saves preserve stock supplied by Ginee");
  const mapped = mapWooCommerceProductToOfissioProduct(await withLiveColorVariants(product, source));
  assert.equal(mapped.colorSizeVariants?.length, 6);
  assert.equal(colorVariantSnapshot(mapped, "Hitam").sku, "FRM-Hitam");
  const sizeVariants = selectColorSizeVariants(mapped, "Hitam", { S: 2, M: 0, L: 0, XL: 0, "2XL": 3, "3XL": 0 })!;
  assert.equal(sizeVariants[1]?.sku, "FRM-HITAM-XXL");
  assert.throws(() => selectColorSizeVariants(mapped, "Hitam", { L: 1 }), /belum tersedia/);
  const item = { productId: "wc-900", source: "woocommerce", sourceId: "900", sku: "FRM-Hitam", parentSku: "FRM", variationId: sizeVariants[0]!.variationId, sizeVariants, sizeMatrix: { S: 2, M: 0, L: 0, XL: 0, "2XL": 3, "3XL": 0 }, totalQty: 5, subtotal: 625000, productSubtotal: 625000, embroideryTotal: 50001, customizationTotal: 50001, finalEstimatedTotal: 675001 } as ValidatedCheckoutCartItem;
  const split = splitOrderSizeVariants(item);
  assert.deepEqual(split.map(row => [row.sku, row.variationId, row.totalQty]), sizeVariants.map(row => [row.sku, row.variationId, row.quantity]));
  assert.equal(split.reduce((sum, row) => sum + row.finalEstimatedTotal, 0), 675001, "splitting must preserve exact total");
  assert.equal(split.reduce((sum, row) => sum + row.embroideryTotal, 0), 50001);
  const wooOrder = mapPaymentOrderToWooCommerceOrder({ order: { id: "order", companyId: "company", items: [{ ...item, productName: "FRM", productSlug: "frm", embroideryPlacements: [], customization: null }], calculation: { shippingFee: 0 } } as unknown as PaymentOrderRecord, payment: { status: "waiting_payment", provider: "manual" } as unknown as PaymentRecord });
  assert.deepEqual(wooOrder.line_items.map(row => [row.sku, row.variation_id, row.quantity]), sizeVariants.map(row => [row.sku, row.variationId, row.quantity]));
  assert.equal(wooOrder.line_items.reduce((sum, row) => sum + Number(row.total), 0), 675001);
  const stock = getOrderStockRequirement({ id: "order", companyId: "company", items: [item] });
  assert.deepEqual(stock.map(row => [row.stockSku, row.requiredQty]), [["FRM-HITAM-S", 2], ["FRM-HITAM-XXL", 3]]);
  const originalIds = rows.map(row => row.id).sort();
  const sizeRow = rows.find(row => row.id === stocked.id)!;
  sizeRow.sku = "FRM-HITAM-2XL";
  const renameInput = { defaultColor: "Putih", variants: mapNativeColorVariants(product, rows).map(row => row.color === "Hitam" ? { ...row, sku: "FRM-HITAM_TEST" } : row) };
  await saveColorVariants(900, renameInput, source);
  assert.deepEqual(rows.map(row => row.id).sort(), originalIds, "SKU edits must not create or replace variation IDs");
  assert.equal(rows.find(row => row.id === stocked.id)?.sku, "FRM-HITAM_TEST-2XL", "keep the configured size suffix");
  assert.equal(rows.find(row => row.id === stocked.id)?.stock_quantity, 17);
  assert.equal(rows.find(row => row.id === stocked.id)?.manage_stock, true);
  const renamed = mapWooCommerceProductToOfissioProduct(await withLiveColorVariants(product, source));
  const renamedSelection = selectColorSizeVariants(renamed, "Hitam", { "2XL": 1 })!;
  assert.equal(renamedSelection[0]?.sku, "FRM-HITAM_TEST-2XL");
  const stockRead = await getProductSizeStock(renamed, "Hitam", { useGinee: () => false, readGinee: async () => null, readWoo: async () => rows });
  assert.equal(stockRead.rows.find(row => row.size === "2XL")?.availableQty, 17, "stock reads actual variation SKU instead of guessing XXL");
  const renamedRequirements = getOrderStockRequirement({ id: "order", companyId: "company", items: [{ ...item, sku: "FRM-HITAM_TEST", sizeVariants: renamedSelection, sizeMatrix: { S: 0, M: 0, L: 0, XL: 0, "2XL": 1, "3XL": 0 }, totalQty: 1 }] });
  assert.equal(renamedRequirements[0]?.stockSku, "FRM-HITAM_TEST-2XL");
  source.getProducts = async () => [{ id: 999, sku: "FRM-COLLISION-S" }] as WooCommerceProduct[];
  const beforeConflict = structuredClone({ product, rows });
  await assert.rejects(saveColorVariants(900, { defaultColor: "Putih", variants: mapNativeColorVariants(product, rows).map(row => row.color === "Hitam" ? { ...row, sku: "FRM-COLLISION" } : row) }, source), /sudah dipakai/);
  assert.deepEqual({ product, rows }, beforeConflict, "conflicting SKU must fail before any writes");
  console.log("PASS: conversion/retry, exact order totals, SKU rename preserving IDs/stock/2XL suffix, actual stock-SKU reads and collision rejection before writes.");
}
main().catch(error => { console.error(error);process.exitCode = 1; });
