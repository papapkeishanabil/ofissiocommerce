import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { productVariantsSchema, selectProductVariants, selectedVariantPrice, PRODUCT_KIND_META, MODEL_CODE_META, mapLegacyProductVariants } from "../src/features/products/product-variants";
import { saveProductVariants } from "../src/features/products/woocommerce/product-variants.service";
import { withLiveColorVariants } from "../src/features/products/woocommerce/color-variants.service";
import { mapWooCommerceProductToOfissioProduct } from "../src/features/products/product.mapper";
import { getMetaBoolean } from "../src/features/products/woocommerce/woocommerce-product-meta";
import { getProductSizeStock } from "../src/features/stock-monitoring/product-size-stock.service";
import { getOrderStockRequirement } from "../src/features/stock-monitoring/woocommerce-stock.service";
import { useCartStore } from "../src/stores/cart-store";
import { emptySizeMatrix } from "../src/types/cart";
import { productServerService } from "../src/features/products/product.server-service";
import { syncCheckoutCart } from "../src/features/checkout/checkout-cart.service";
import { buildQuotationItems } from "../src/features/quotation/quotation.utils";
import { splitOrderSizeVariants } from "../src/features/orders/order-size-variants";
import { mapPaymentOrderToWooCommerceOrder } from "../src/features/orders/order.mapper";
import type { PaymentOrderRecord, PaymentRecord } from "../src/features/payment/payment.types";
import type { WooCommerceProduct, WooCommerceProductVariation, WooCommerceProductVariationWritePayload, WooCommerceProductWritePayload } from "../src/features/products/woocommerce/woocommerce.types";

process.env.DATABASE_PROVIDER = "mock";

function fixture() {
  let product: WooCommerceProduct = {
    id: 900, name: "Kemeja SN Merah", slug: "sn-merah", sku: "OFS-test", status: "publish", type: "variable",
    description: "Kemeja untuk pengujian", short_description: "Kemeja", price: "100000", regular_price: "100000", sale_price: "",
    categories: [{ id: 1, name: "Kemeja", slug: "kemeja" }],
    images: [{ id: 11, src: "https://images.example/pendek.jpg" }, { id: 12, src: "https://images.example/panjang.jpg" }], attributes: [],
    meta_data: Object.entries({
      [PRODUCT_KIND_META]: "variable", [MODEL_CODE_META]: "SN", industries: '["office"]', moq: 1, lead_time: "3 hari",
      fulfillment_type: "ready_stock", transaction_mode: "direct_checkout", quantity_pricing_enabled: "0",
      available_colors: '["Merah"]', available_sizes: '["S","M"]', supports_embroidery: "0",
    }).map(([key, value]) => ({ key, value })),
  };
  const rows: WooCommerceProductVariation[] = [];
  let nextId = 1000, writes = 0, failSku = "";
  const mergeMeta = (old: WooCommerceProduct["meta_data"], incoming: WooCommerceProduct["meta_data"]) => [...(old ?? []).filter(row => !incoming?.some(entry => entry.key === row.key)), ...(incoming ?? [])];
  const materialize = (id: number, input: WooCommerceProductVariationWritePayload, existing?: WooCommerceProductVariation): WooCommerceProductVariation => {
    if (input.sku === failSku) throw new Error("Simulated provider failure");
    return { ...existing, ...input, id, sku: input.sku ?? existing?.sku ?? "", image: input.image?.id ? product.images?.find(image => image.id === input.image!.id) : existing?.image, meta_data: mergeMeta(existing?.meta_data, input.meta_data) };
  };
  const source = {
    getProductById: async () => structuredClone(product),
    getProducts: async () => [structuredClone(product)],
    getProductVariations: async () => structuredClone(rows),
    updateProduct: async (_id: string | number, input: WooCommerceProductWritePayload) => {
      writes++;
      product = { ...product, ...input, tags: product.tags, categories: product.categories, images: product.images, attributes: input.attributes?.map(a => ({ id: a.id ?? 0, name: a.name ?? "", slug: a.name ?? "", ...a })) ?? product.attributes, meta_data: mergeMeta(product.meta_data, input.meta_data) };
      return structuredClone(product);
    },
    createProductVariation: async (_id: string | number, input: WooCommerceProductVariationWritePayload) => { writes++; const row = materialize(nextId++, input); rows.push(row); return structuredClone(row); },
    updateProductVariation: async (_id: string | number, id: string | number, input: WooCommerceProductVariationWritePayload) => { writes++; const i = rows.findIndex(row => row.id === Number(id)); rows[i] = materialize(Number(id), input, rows[i]); return structuredClone(rows[i]!); },
  };
  return { source, rows, get product() { return product; }, get writes() { return writes; }, setFail(sku: string) { failSku = sku; } };
}

const options = [{ name: "Warna", values: ["Merah"] }, { name: "Lengan", values: ["Pendek", "Panjang"] }, { name: "Saku", values: ["Dengan Saku", "Tanpa Saku"] }, { name: "Ukuran", values: ["S", "M"] }];
const variants = ["Pendek", "Panjang"].flatMap((lengan, i) => ["Dengan Saku", "Tanpa Saku"].flatMap((saku, j) => ["S", "M"].map(size => ({
  sku: `SN-MERAH-${i ? "LPJ" : "LP"}-${j ? "NS" : "SK"}-${size}`,
  options: { Warna: "Merah", Lengan: lengan, Saku: saku, Ukuran: size },
  imageSrc: `https://images.example/${i ? "panjang" : "pendek"}.jpg`, regularPrice: i ? 120000 : 100000,
}))));
const input = { options, variants, defaultVariantSku: variants[0]!.sku };

async function run() {
  const imported = ["S", "M", "L", "XL", "XXL", "3XL"].map((size, index) => ({ id: 729 + index, sku: `KK-020-${size}`, status: "publish", attributes: [], regular_price: index > 3 ? "125000" : "120000", stock_quantity: 7 }));
  const importedOptions = [{ name: "Warna", values: ["Putih"] }, { name: "Ukuran", values: ["S", "M", "L", "XL", "XXL", "3XL"] }];
  const migrated = mapLegacyProductVariants(imported, importedOptions);
  assert.deepEqual(migrated.map(row => row.id), imported.map(row => row.id));
  assert.deepEqual(migrated.map(row => row.sku), imported.map(row => row.sku));
  assert.deepEqual(migrated.map(row => row.regularPrice), [120000,120000,120000,120000,125000,125000]);
  assert.equal(migrated[0]?.options.Warna, "Putih");
  assert.equal(migrated[5]?.options.Ukuran, "3XL");
  assert.deepEqual(mapLegacyProductVariants(imported, [...importedOptions, { name: "Lengan", values: ["Pendek", "Panjang"] }]), [], "never guess multiple sleeve choices");
  assert.deepEqual(mapLegacyProductVariants([...imported, { ...imported[0]!, id: 9000 }], importedOptions), [], "ambiguous duplicate combinations block migration");
  const importedFixture = fixture();
  importedFixture.rows.push(...structuredClone(imported));
  await saveProductVariants(900, { options: importedOptions, variants: migrated, defaultVariantSku: migrated[0]!.sku }, importedFixture.source);
  assert.equal(importedFixture.rows.length, 6, "migration reuses six existing native rows");
  assert.deepEqual(importedFixture.rows.map(row => row.stock_quantity), [7,7,7,7,7,7], "migration preserves stock");
  assert(productVariantsSchema.safeParse(input).success);
  assert(!productVariantsSchema.safeParse({ ...input, variants: [variants[0], variants[0]] }).success);
  assert(!productVariantsSchema.safeParse({ ...input, defaultVariantSku: "missing" }).success);
  assert(!productVariantsSchema.safeParse({ ...input, variants: [{ ...variants[0], options: { Warna: "Merah" } }] }).success);
  const f = fixture();
  const withMainPhoto = { ...input, variants: input.variants.map((row, index) => index === 2 ? { ...row, imageSrc: "" } : row) };
  const saved = await saveProductVariants(900, withMainPhoto, f.source);
  assert.equal(saved.length, 8);
  assert.equal(saved[2]?.imageSrc, "", "using the main photo remains an inherited choice after reload");
  f.rows[0]!.manage_stock = true; f.rows[0]!.stock_quantity = 23;
  await saveProductVariants(900, { ...input, variants: saved }, f.source);
  assert.equal(f.rows.length, 8, "save must reuse native IDs");
  assert.equal(f.rows[0]?.stock_quantity, 23, "editing does not reset Ginee stock");
  const product = mapWooCommerceProductToOfissioProduct(await withLiveColorVariants(f.product, f.source));
  assert.equal(product.modelCode, "SN");
  assert.equal(product.productVariants?.length, 8);
  assert.equal(product.priceFrom, 100000);
  const selection = { Warna: "Merah", Lengan: "Panjang", Saku: "Tanpa Saku" };
  const sizes = { ...emptySizeMatrix(), S: 2, M: 3 };
  const chosen = selectProductVariants(product, sizes, selection)!;
  assert.deepEqual(chosen.map(row => row.sku), ["SN-MERAH-LPJ-NS-S", "SN-MERAH-LPJ-NS-M"]);
  assert.throws(() => selectProductVariants(product, sizes, { ...selection, Saku: "Tidak Ada" }), /tidak tersedia/);
  assert.throws(() => selectProductVariants(product, sizes, {}), /tidak tersedia/);
  assert.equal(selectedVariantPrice(product, selection, sizes), 120000);
  const requests: string[] = [];
  const stock = await getProductSizeStock(product, "Merah", { useGinee: () => true, readGinee: async sku => { requests.push(sku); return sku.endsWith("-S") ? 5 : 8; }, readWoo: async () => [] }, undefined, selection);
  assert.deepEqual(requests, chosen.map(row => row.sku));
  assert.deepEqual(stock.rows.map(row => row.availableQty), [5, 8]);
  requests.length = 0;
  await getProductSizeStock(product, "Merah", { useGinee: () => true, readGinee: async sku => { requests.push(sku); return 999; }, readWoo: async () => [] }, undefined, {});
  assert.equal(requests.length, 0, "missing variant must not guess parent stock SKU");
  useCartStore.setState({ items: [] });
  assert(useCartStore.getState().add({ product, color: "Merah", sizes, selectedOptions: selection }).ok);
  assert(useCartStore.getState().add({ product, color: "Merah", sizes, selectedOptions: { ...selection, Lengan: "Pendek" } }).ok);
  assert.equal(useCartStore.getState().items.length, 2, "different sleeves must not merge");
  assert.equal(useCartStore.getState().items[0]?.finalUnitPrice, 120000);
  assert.equal(useCartStore.getState().items[0]?.image, "https://images.example/panjang.jpg");
  const originalRead = productServerService.getProductById;
  productServerService.getProductById = async () => product;
  try {
    const cart = await syncCheckoutCart({ companyId: "company-variants", userId: "user-variants", items: [{ productId: product.id, selectedColor: "Merah", selectedOptions: selection, sizeMatrix: sizes, customization: null, embroideryPlacements: [] }] });
    const line = cart.items[0]!;
    assert.equal(line.finalUnitPrice, 120000);
    assert.equal(line.subtotal, 600000);
    assert.deepEqual(line.selectedOptions, selection);
    assert.deepEqual(line.sizeVariants?.map(row => row.sku), chosen.map(row => row.sku));
    assert.deepEqual(splitOrderSizeVariants(line).map(row => row.sku), chosen.map(row => row.sku));
    const quote = buildQuotationItems(cart.items, "quote-variants", new Date().toISOString());
    assert.deepEqual(quote[0]?.itemSnapshot.selectedOptions, selection);
    const order = { id: "order-variants", companyId: "company-variants", items: cart.items, calculation: { shippingFee: 0 } } as PaymentOrderRecord;
    const mapped = mapPaymentOrderToWooCommerceOrder({ order, payment: { status: "waiting_payment" } as PaymentRecord });
    assert.deepEqual(mapped.line_items.map(row => row.sku), chosen.map(row => row.sku));
    assert.deepEqual(mapped.line_items.map(row => row.variation_id), chosen.map(row => row.variationId));
    assert.deepEqual(getOrderStockRequirement(order).map(row => row.stockSku), chosen.map(row => row.sku));
  } finally { productServerService.getProductById = originalRead; }
  const partial = fixture(); partial.setFail(variants[2]!.sku);
  await assert.rejects(saveProductVariants(900, input, partial.source), /Simulated/);
  assert(!getMetaBoolean(partial.product.meta_data ?? [], "ofissio_stock_variants_ready", true));
  partial.setFail(""); await saveProductVariants(900, input, partial.source);
  assert.equal(partial.rows.length, 8, "partial save retry reuses rows");
  const legacy = fixture(); legacy.rows.push({ id: 42, sku: "OLD-S", status: "publish", attributes: [] });
  await assert.rejects(saveProductVariants(900, input, legacy.source), /varian lama/);
  assert.equal(legacy.writes, 0, "unmapped legacy stock must remain untouched");
  const simple = mapWooCommerceProductToOfissioProduct({ ...f.product, sku: "KL-003", type: "simple", meta_data: [...f.product.meta_data!, { key: PRODUCT_KIND_META, value: "simple" }, { key: "available_sizes", value: '["OS"]' }] });
  const direct: string[] = [];
  await getProductSizeStock(simple, "Merah", { useGinee: () => true, readGinee: async sku => { direct.push(sku); return 9; }, readWoo: async () => [] });
  assert.deepEqual(direct, ["KL-003"]);
  productServerService.getProductById = async () => simple;
  try {
    const cart = await syncCheckoutCart({ companyId: "company-simple", userId: "user-simple", items: [{ productId: simple.id, selectedColor: "Merah", sizeMatrix: { ...emptySizeMatrix(), OS: 3 }, customization: null, embroideryPlacements: [] }] });
    assert.equal(cart.items[0]?.sku, "KL-003");
    assert.equal(cart.items[0]?.sizeVariants, undefined);
    assert.deepEqual(getOrderStockRequirement({ id: "simple-order", companyId: "company-simple", items: cart.items }).map(row => row.stockSku), ["KL-003"]);
  } finally { productServerService.getProductById = originalRead; }
  const noSize = fixture();
  const sleeveOnly = fixture();
  await saveProductVariants(900, {
    options: options.filter(o => o.name !== "Warna"),
    variants: variants.map(v => ({ ...v, options: { Lengan: v.options.Lengan, Saku: v.options.Saku, Ukuran: v.options.Ukuran } })),
    defaultVariantSku: variants[0]!.sku,
  }, sleeveOnly.source);
  assert.deepEqual(mapWooCommerceProductToOfissioProduct(sleeveOnly.product).available_colors, ["Merah"], "sleeve variants preserve the product color attribute");
  const noSizeInput = { options: options.filter(o => o.name !== "Ukuran"), variants: variants.filter(v => v.options.Ukuran === "S").map(v => ({ ...v, options: { Warna: v.options.Warna, Lengan: v.options.Lengan, Saku: v.options.Saku } })), defaultVariantSku: variants[0]!.sku };
  await saveProductVariants(900, noSizeInput, noSize.source);
  const noSizeProduct = mapWooCommerceProductToOfissioProduct(await withLiveColorVariants(noSize.product, noSize.source));
  assert.deepEqual(noSizeProduct.available_sizes, ["OS"]);
  assert.equal(selectProductVariants(noSizeProduct, { ...emptySizeMatrix(), OS: 2 }, selection)?.[0]?.sku, "SN-MERAH-LPJ-NS-S");
  assert.throws(() => selectProductVariants(noSizeProduct, sizes, selection), /tidak memiliki pilihan ukuran/);
  // Export only synthetic product data for the local browser fixture.
  writeFileSync(".tmp-variant-fixture.json", JSON.stringify(product));
  console.log("PASS: arbitrary options, native save/read/retry, stock preservation, exact SKU lookup, distinct cart lines, server prices, quotation/order snapshots, legacy protection and simple SKU.");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
