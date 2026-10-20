import assert from "node:assert/strict";
import { getProductSizeStock } from "../src/features/stock-monitoring/product-size-stock.service";
import { sizeStockSku } from "../src/features/stock-monitoring/product-size-stock.types";
import type { OfissioProduct } from "../src/features/products/product.types";
import type { WooCommerceProductVariation } from "../src/features/products/woocommerce/woocommerce.types";

async function main() {
  const product = {
    sku: "SN-Blue", source: "woocommerce", source_id: "1188",
    available_colors: ["Navy", "Baby Blue"], available_sizes: ["S", "M"],
    colorVariantsEnabled: true, colorVariantsReady: true,
    colorVariants: [
      { id: 1, color: "Navy", sku: "SN-Navy", imageSrc: "", stockQuantity: 99 },
      { id: 2, color: "Baby Blue", sku: "SN-Baby-Blue", imageSrc: "", stockQuantity: 99 },
    ],
  } as unknown as OfissioProduct;
  const requested: string[] = [];
  const dependencies = {
    useGinee: () => true,
    readGinee: async (sku: string) => { requested.push(sku); return sku === "SN-NAVY-S" ? 12 : 0; },
    readWoo: async () => [] as WooCommerceProductVariation[],
  };
  const navy = await getProductSizeStock(product, "navy", dependencies);
  assert.deepEqual(navy.rows, [
    { size: "S", sku: "SN-NAVY-S", availableQty: 12 },
    { size: "M", sku: "SN-NAVY-M", availableQty: 0 },
  ]);
  assert.deepEqual(requested.sort(), ["SN-NAVY-M", "SN-NAVY-S"]);
  assert.equal(sizeStockSku("FRM-Hitam", "L"), "FRM-HITAM-L");
  const baby = await getProductSizeStock(product, "Baby Blue", { ...dependencies, readGinee: async sku => sku === "SN-BABY-BLUE-S" ? 4 : null });
  assert.equal(baby.rows[0]?.availableQty, 4);
  assert.equal(baby.rows[1]?.availableQty, null, "missing SKU is unknown, not zero");
  const failed = await getProductSizeStock(product, "Navy", { ...dependencies, readGinee: async () => { throw Error("Provider unavailable"); } });
  assert(failed.rows.every(row => row.availableQty === null));
  await assert.rejects(getProductSizeStock(product, "Hitam", dependencies), /Warna produk tidak tersedia/);
  const wooRows = [
    { status: "publish", sku: "SN-NAVY", manage_stock: true, stock_quantity: 99 },
    { status: "publish", sku: "SN-NAVY-S", manage_stock: true, stock_quantity: 7, stock_status: "instock" },
    { status: "publish", sku: "SN-NAVY-M", manage_stock: false, stock_quantity: null },
  ] as WooCommerceProductVariation[];
  const woo = await getProductSizeStock(product, "Navy", { ...dependencies, useGinee: () => false, readWoo: async () => wooRows });
  assert.equal(woo.rows[0]?.availableQty, 7);
  assert.equal(woo.rows[1]?.availableQty, null, "never inherit color stock for a missing size");
  const unready = await getProductSizeStock({ ...product, colorVariantsReady: false }, "Navy", dependencies);
  assert(unready.rows.every(row => row.availableQty === null));
  console.log("PASS: exact color-size SKUs, distinct quantities, zero vs unknown, provider failure, invalid color, Woo exact match and incomplete variants.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
