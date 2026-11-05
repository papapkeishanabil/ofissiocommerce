import assert from "node:assert/strict";
import { PRODUCT_MOCK_DATA } from "../src/features/products/product.mock-data";
import { merchantProduct, merchantXml, xmlText } from "../src/features/products/merchant-feed";
import { linkedVariantSelection, linkedVariantSizes } from "../src/features/products/product-variant-links";
import type { OfissioProduct } from "../src/features/products/product.types";
import type { WooCommerceProductVariation } from "../src/features/products/woocommerce/woocommerce.types";

const product: OfissioProduct = { ...PRODUCT_MOCK_DATA[0]!, source: "woocommerce", source_id: "12", status: "published",
  name: "Kemeja & Seragam", slug: "test-shirt", moq: 1, transaction_mode: "HYBRID", priceFrom: 125000,
  quantityPricing: undefined, productKind: undefined, colorVariantsEnabled: false, stockVariantsReady: true,
  gender: "men", colors: ["Putih"], available_sizes: ["S", "2XL"], defaultColor: "Putih", sleeve_type: "short",
  mainImage: "https://woo.ofissio.com/image.webp", description: "Pakaian <aman> & rapi",
  purchaseVariants: [{ id: 1, sku: "SH-S", size: "S", color: "Putih", sleeve: "Pendek" },
    { id: 2, sku: "SH-LONG-XXL", size: "XXL", color: "Putih", sleeve: "Panjang" }],
};
const rows: WooCommerceProductVariation[] = [
  { id: 1, sku: "SH-S", status: "publish", price: "125000", regular_price: "125000", stock_status: "instock" },
  { id: 2, sku: "SH-LONG-XXL", status: "publish", price: "125000", regular_price: "125000", stock_status: "outofstock" },
];
const result = merchantProduct(product, rows);
assert.equal(result.items.length, 2);
assert.notEqual(result.items[0]!.group, result.items[1]!.group, "short and long sleeves need different groups");
assert.equal(result.items[1]!.availability, "out_of_stock");
assert.match(result.items[1]!.link, /variant=SH-LONG-XXL$/);
assert.deepEqual(linkedVariantSizes(product, "SH-LONG-XXL"), { "2XL": 1 });
assert.equal(linkedVariantSelection(product, "SH-LONG-XXL")?.sleeve, "Panjang");
assert.equal(linkedVariantSelection(product, "unknown"), undefined);
assert.equal(merchantProduct({ ...product, moq: 8 }, rows).items.length, 0);
assert.equal(merchantProduct({ ...product, source: "mock" }, rows).items.length, 0);
assert.equal(merchantProduct({ ...product, transaction_mode: "REQUEST_QUOTATION" }, rows).items.length, 0);
assert.equal(merchantProduct(product, [{ ...rows[0]!, price: "100000", sale_price: "100000" }]).items.length, 0);
assert.equal(merchantProduct(product, [{ ...rows[0]!, stock_status: "onbackorder" }]).items.length, 0);
assert.equal(merchantProduct(product, [{ ...rows[0]!, status: "private" }]).items.length, 0);
assert.equal(merchantProduct({ ...product, mainImage: "https://private.invalid/a", images: [] }, rows).items.length, 0);
const colorSize = { ...product, colorSizeVariantsEnabled: true, colorVariantsEnabled: true, colorVariantsReady: true,
  colorSizeVariants: [{ id: 1, sku: "SH-S", color: "Putih", size: "S" }],
  colorVariants: [{ id: 1, sku: "WHITE", color: "Putih", imageSrc: "https://woo.ofissio.com/white.webp", stockQuantity: null }] };
assert.equal(merchantProduct(colorSize, rows).items[0]!.image, "https://woo.ofissio.com/white.webp");
assert.equal(linkedVariantSelection(colorSize, "SH-S")?.color, "Putih");
const generic: OfissioProduct = { ...product, productKind: "variable", variantOptions: [
  { name: "Ukuran", values: ["S"] }, { name: "Lengan", values: ["Pendek"] }],
  productVariants: [{ id: 1, sku: "SH-S", options: { Ukuran: "S", Lengan: "Pendek" }, regularPrice: 125000, imageSrc: "https://woo.ofissio.com/generic.webp" }] };
assert.equal(merchantProduct(generic, rows).items.length, 1, "single-color generic product still exports its real color");
assert.equal(merchantProduct(generic, rows).items[0]!.color, "Putih");
assert.equal(xmlText('<&"\u0000'), "&lt;&amp;&quot;");
const xml = merchantXml(result.items);
assert.match(xml, /xmlns:g="http:\/\/base.google.com\/ns\/1.0"/);
assert.match(xml, /125000.00 IDR/);
assert.match(xml, /&amp;/);
for (const invented of ["<g:gtin>", "<g:mpn>", "<g:shipping>", "<g:identifier_exists>"]) assert.ok(!xml.includes(invented));
console.log("PASS merchant feed: variant links, size/color selection, sleeve groups, stock, price mismatch, publication, MOQ, images, XML escaping, no invented identifiers/shipping");
