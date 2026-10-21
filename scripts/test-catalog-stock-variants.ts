import assert from "node:assert/strict";
import { ensureSizeVariants } from "../src/features/products/woocommerce/size-variants.service";
import { saveStockVariantEdits } from "../src/features/products/woocommerce/stock-variant-editor.service";
import { checkoutSizeMatrixSchema } from "../src/features/checkout/checkout-cart.validation";
import { mapPurchaseVariants, matchingPurchaseVariant } from "../src/features/products/purchase-variants";
import type { WooCommerceProduct, WooCommerceProductVariation } from "../src/features/products/woocommerce/woocommerce.types";
import type { VariantSource } from "../src/features/products/woocommerce/color-variants.service";

async function main() {
  let product = { id: 10, sku: "TEST", type: "simple", regular_price: "100", attributes: [{ id: 2, name: "Ukuran", slug: "pa_ukuran", variation: false, options: ["XS", "S", "XXL"] }], meta_data: [{ key: "available_colors", value: '["Putih"]' }, { key: "available_sizes", value: '["XS","S","2XL"]' }] } as unknown as WooCommerceProduct;
  let rows: WooCommerceProductVariation[] = []; let writes: Record<string, unknown>[] = [];
  const source = {
    getProductById: async () => product, getProducts: async () => [], getProductVariations: async () => rows,
    updateProduct: async (_id: number, payload: Partial<WooCommerceProduct>) => { writes.push(payload); product = { ...product, ...payload, meta_data: [...(product.meta_data ?? []).filter(m => !payload.meta_data?.some(n => n.key === m.key)), ...(payload.meta_data ?? [])], attributes: payload.attributes?.map(a => ({ ...a, name: a.name || "Ukuran", slug: a.slug || "pa_ukuran" })) ?? product.attributes }; return product; },
    createProductVariation: async (_id: number, payload: Partial<WooCommerceProductVariation>) => { const row = { id: 100 + rows.length, ...payload } as WooCommerceProductVariation; rows.push(row); writes.push(payload); return row; },
    updateProductVariation: async (_id: number, id: number, payload: Partial<WooCommerceProductVariation>) => { writes.push(payload); const i = rows.findIndex(r => r.id === id); rows[i] = { ...rows[i]!, ...payload }; return rows[i]!; },
  } as unknown as VariantSource;
  await ensureSizeVariants(product, source);
  assert.deepEqual(rows.map(r => r.sku), ["TEST-XS", "TEST-S", "TEST-XXL"]);
  assert(rows.every(r => r.stock_quantity === null), "No invented inventory");
  const ids = rows.map(r => r.id); await ensureSizeVariants(product, source); assert.deepEqual(rows.map(r => r.id), ids, "Retry must preserve IDs");
  rows[2] = { ...rows[2]!, manage_stock: true, stock_quantity: 17 }; writes = [];
  await saveStockVariantEdits(10, { rows: rows.map(r => ({ id: r.id, sku: r.sku === "TEST-XXL" ? "TEST-2XL" : r.sku, size: r.sku.split("-").at(-1)! as "XS" | "S" | "XXL" })) }, source);
  assert.equal(rows[2]?.sku, "TEST-2XL"); assert.equal(rows[2]?.stock_quantity, 17); assert.deepEqual(rows.map(r => r.id), ids);
  assert(writes.every(p => !("stock_quantity" in p) && !("manage_stock" in p)), "Mapping edits never touch stock");
  writes = [];
  await assert.rejects(saveStockVariantEdits(10, { rows: [{ id: 999, sku: "BAD-S", size: "S" }] }, source)); assert.equal(writes.length, 0);
  await assert.rejects(ensureSizeVariants({ ...product, type: "simple", sku: "COLLISION" }, { ...source, getProducts: async () => [{ id: 999, sku: "COLLISION-XS" }] as WooCommerceProduct[] }));
  assert.equal(writes.length, 0, "Collision rejected before writes");
  const old = checkoutSizeMatrixSchema.parse({ S: 1, M: 0, L: 0, XL: 0, "2XL": 0, "3XL": 0 }); assert.equal(old.XS, 0);
  const xs = checkoutSizeMatrixSchema.parse({ ...old, XS: 2, "4XL": 3 }); assert.equal(xs.XS, 2); assert.equal(xs["4XL"], 3);
  const purchase = mapPurchaseVariants([{ id: 1, status: "publish", sku: "TG-C-S", attributes: [] }, { id: 2, status: "publish", sku: "TG-BN-S", attributes: [] }] as unknown as WooCommerceProductVariation[]);
  assert.equal(matchingPurchaseVariant({ sku: "TG-C", purchaseVariants: purchase } as never, "S")?.id, 1, "Do not mix a hidden different SKU prefix");
  console.log("PASS: automatic native sizes, retry without duplicates, exact SKU edits preserving stock and IDs, ownership/collision checks, XS/4XL and old carts, prefix isolation.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
