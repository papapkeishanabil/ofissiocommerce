import assert from "node:assert/strict";
import { filterGuideProducts, guideProduct } from "../src/features/product-guide/product-guide";
import type { OfissioProduct } from "../src/features/products/product.types";

const dual = guideProduct({ slug: "dual", name: "Kemeja Dua Lengan", material: "Twil Katun", gender: "men", sleeve_type: "short", available_sizes: ["S", "M"], priceFrom: 120000, categories: [{ id: 1, name: "Kantor", slug: "kantor" }, { id: 2, name: "Lapangan", slug: "lapangan" }], variantOptions: [{ name: "Lengan", values: ["Pendek", "Panjang"] }] } as OfissioProduct);
const women = guideProduct({ slug: "wanita", name: "SN Wanita", material: "Toyobo", gender: "women", sleeve_type: "long", available_sizes: ["XS", "S"], priceFrom: 125000, categories: [{ id: 1, name: "Kantor", slug: "kantor" }] } as OfissioProduct);
const filters = { query: "", category: "", gender: "", sleeve: "" };
const products = [dual, women];
assert.equal(filterGuideProducts(products, filters).length, 2, "No product is omitted by default");
assert.deepEqual(filterGuideProducts(products, { ...filters, category: "lapangan", sleeve: "Panjang" }), [dual], "Secondary categories and both sleeve choices remain discoverable");
assert.deepEqual(filterGuideProducts(products, { ...filters, query: " TWIL KATUN " }), [dual]);
assert.deepEqual(filterGuideProducts(products, { ...filters, gender: "Wanita", sleeve: "Pendek" }), []);
assert.deepEqual(filterGuideProducts(products, { ...filters, gender: "Wanita", query: "SN" }), [women]);
assert.deepEqual(dual.sizes, ["S", "M"]);
assert.equal(dual.price, 120000);
console.log("PASS product guide: complete list, category membership, sleeve variants, combined filters, source facts");
