import assert from "node:assert/strict";
import { catalogExportSchema } from "../src/features/catalog-export/catalog-export.schema";
import { selectCatalogProducts, toCatalogProduct } from "../src/features/catalog-export/catalog-export.model";
import type { WooCommerceProduct, WooCommerceProductVariation } from "../src/features/products/woocommerce/woocommerce.types";

const options = catalogExportSchema.parse({ scope: "all" });
assert.equal(catalogExportSchema.safeParse({ scope: "category" }).success, false);
assert.equal(catalogExportSchema.safeParse({ scope: "selected", productIds: Array.from({ length: 201 }, (_, i) => i + 1) }).success, false);
const product: WooCommerceProduct = { id: 1, name: "Kemeja KK-001", slug: "kk-001", sku: "KK-001", status: "publish", type: "variable", description: "<h2>Deskripsi lengkap</h2><p>Semua informasi produk tetap tersedia.</p><script>alert(1)</script>", short_description: "Singkat", price: "100000", regular_price: "100000", sale_price: "", meta_data: [{ key: "sleeve_type", value: "short" }], categories: [{ id: 10, name: "Kemeja", slug: "kemeja" }] };
function variation(id: number, sleeve: string, size: string, color = "Navy"): WooCommerceProductVariation {
  return { id, status: "publish", sku: `KK-001-${sleeve}-${color}-${size}`, price: "100000", regular_price: "100000", attributes: [{ name: "Warna", option: color }, { name: "Lengan", option: sleeve }, { name: "Ukuran", option: size }] } as WooCommerceProductVariation;
}
const result = toCatalogProduct(product, [variation(1, "Panjang", "S"), variation(2, "Pendek", "M"), variation(3, "Pendek", "S")]);
assert.equal(result.variants.length, 1);
assert.equal(result.variants[0]!.sleeve, "Pendek");
assert.equal(result.variants[0]!.sku, "KK-001-Pendek-Navy-S");
assert.deepEqual(result.variants[0]!.sizes, ["S", "M"]);
assert.match(result.descriptionHtml, /Semua informasi/);
assert.doesNotMatch(result.descriptionHtml, /script|alert/);
assert.equal(selectCatalogProducts([product, { ...product, id: 2, status: "draft" }], options).length, 1);
assert.throws(() => selectCatalogProducts([product], { ...options, scope: "selected", productIds: [2] }));
assert.equal(selectCatalogProducts([product], { ...options, scope: "category", categoryIds: [10] }).length, 1);
const many = toCatalogProduct(product, Array.from({ length: 9 }, (_, i) => [variation(i * 2 + 1, "Pendek", "S", `Warna ${i}`), variation(i * 2 + 2, "Pendek", "M", `Warna ${i}`)]).flat());
assert.equal(many.variants.length, 9);
assert.ok(many.variants.every(v => v.sizes.length === 2));
const invalid = { ...product, meta_data: [{ key: "ofissio_product_kind", value: "variable" }] };
assert.throws(() => toCatalogProduct(invalid, []), /belum lengkap/);
console.log("Catalogue selection, validation, full description, legacy sleeves and nine-color grouping passed.");
