import assert from "node:assert/strict";
import { mapPurchaseVariants, selectPurchaseVariants } from "../src/features/products/purchase-variants";
import { getProductSizeStock } from "../src/features/stock-monitoring/product-size-stock.service";
import { mapWooCommerceProductToOfissioProduct } from "../src/features/products/product.mapper";
import { withLiveColorVariants } from "../src/features/products/woocommerce/color-variants.service";
import { useCartStore } from "../src/stores/cart-store";
import type { WooCommerceProduct, WooCommerceProductVariation } from "../src/features/products/woocommerce/woocommerce.types";
import { emptySizeMatrix } from "../src/types/cart";

async function main() {
  const rows = [
    { id: 491, sku: "KK-012LPD-S", status: "publish", manage_stock: true, stock_quantity: 18, stock_status: "instock", attributes: [{ name: "panjang-lengan", option: "LENGAN PENDEK" }] },
    { id: 497, sku: "KK-012LPJ-S", status: "publish", manage_stock: true, stock_quantity: 10, stock_status: "instock", attributes: [{ name: "panjang-lengan", option: "LENGAN PANJANG" }] },
    { id: 499, sku: "KK-012LPJ-XXL", status: "publish", manage_stock: true, stock_quantity: 12, stock_status: "instock", attributes: [{ name: "panjang-lengan", option: "LENGAN PANJANG" }] },
  ] as WooCommerceProductVariation[];
  const raw = { id: 484, name: "Kemeja Kantor", sku: "KK-012", slug: "kk-012", status: "publish", type: "variable", price: "125000", regular_price: "125000", images: [], attributes: [], categories: [], meta_data: [{ key: "available_colors", value: '["Putih"]' }, { key: "available_sizes", value: '["S","XXL"]' }, { key: "ofissio_purchase_variants_enabled", value: true }] } as unknown as WooCommerceProduct;
  const enriched = await withLiveColorVariants(raw, { getProductVariations: async () => rows } as never);
  const product = { ...mapWooCommerceProductToOfissioProduct(enriched), category: "Kemeja", industries: ["Corporate"], lead_time: "1 hari", available_colors: ["Putih"], colors: ["Putih"], available_sizes: ["S", "XXL"], moq: 1 };
  assert.equal(product.purchaseVariants?.length, 3);
  assert.equal(mapPurchaseVariants([{ ...rows[0]!, status: "private" }]).length, 0);
  assert.throws(() => selectPurchaseVariants(product, { S: 1 }), /jenis lengan/);
  assert.throws(() => selectPurchaseVariants(product, { M: 1 }, "LENGAN PANJANG"), /belum tersedia/);
  assert.equal(selectPurchaseVariants(product, { S: 2 }, "LENGAN PENDEK")?.[0]?.variationId, 491);
  assert.equal(selectPurchaseVariants(product, { "2XL": 3 }, "LENGAN PANJANG")?.[0]?.sku, "KK-012LPJ-XXL");
  const deps = { useGinee: () => false, readGinee: async () => null, readWoo: async () => rows };
  const short = await getProductSizeStock(product, "Putih", deps, "LENGAN PENDEK");
  const long = await getProductSizeStock(product, "Putih", deps, "LENGAN PANJANG");
  assert.equal(short.rows[0]?.availableQty, 18); assert.equal(long.rows[0]?.availableQty, 10);
  assert.equal(long.rows[1]?.availableQty, 12);
  await assert.rejects(getProductSizeStock(product, "Putih", deps, "INVALID"));
  const ambiguous = { ...product, purchaseVariants: [...product.purchaseVariants!, product.purchaseVariants![0]!] };
  assert.throws(() => selectPurchaseVariants(ambiguous, { S: 1 }, "LENGAN PENDEK"), /tidak unik/);
  useCartStore.getState().clear();
  for (const sleeve of ["LENGAN PENDEK", "LENGAN PANJANG"]) {
    const result = useCartStore.getState().add({ product: { ...product, source: "mock" }, selectedSleeve: sleeve, color: "Putih", sizes: { ...emptySizeMatrix(), S: 1 } });
    assert.equal(result.ok, true, result.reason);
  }
  assert.equal(useCartStore.getState().items.length, 2, "Sleeves must not merge in the cart");
  assert.deepEqual(useCartStore.getState().items.map(i => i.selectedSleeve), ["LENGAN PENDEK", "LENGAN PANJANG"]);
  console.log("Purchase variant tests passed: exact native SKUs, sleeve stock isolation, XXL alias, missing/ambiguous rejection, separate cart lines.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
