import assert from "node:assert/strict";
import {
  BASE_PRICE_META, COLOR_VARIANTS_ENABLED_META, COLOR_VARIANTS_READY_META,
  COLOR_VARIANT_MARKER, colorVariantGallery, colorVariantIssue, colorVariantSnapshot, updateVariantModelAdjustment, readVariantModelAdjustment,
} from "../src/features/products/color-variants";
import { saveColorVariants, withLiveColorVariants } from "../src/features/products/woocommerce/color-variants.service";
import { adminColorVariantsSchema } from "../src/features/products/woocommerce/color-variants.validation";
import { getMetaBoolean } from "../src/features/products/woocommerce/woocommerce-product-meta";
import { mapWooCommerceProductToOfissioProduct } from "../src/features/products/product.mapper";
import { validateProductForCart } from "../src/features/products/product.validation";
import { productServerService } from "../src/features/products/product.server-service";
import { syncCheckoutCart, getValidatedCheckoutCart } from "../src/features/checkout/checkout-cart.service";
import { useCartStore } from "../src/stores/cart-store";
import { emptySizeMatrix } from "../src/types/cart";
import { buildQuotationItems } from "../src/features/quotation/quotation.utils";
import { mapPaymentOrderToWooCommerceOrder } from "../src/features/orders/order.mapper";
import { compareOrderRequirementWithWooStock, getOrderStockRequirement, getWooSizeStockMatrix, getWooStockBySku } from "../src/features/stock-monitoring/woocommerce-stock.service";
import type { WooCommerceProduct, WooCommerceProductVariation, WooCommerceProductVariationWritePayload, WooCommerceProductWritePayload } from "../src/features/products/woocommerce/woocommerce.types";
import type { PaymentOrderRecord, PaymentRecord } from "../src/features/payment/payment.types";
import { DEFAULT_MODEL_COLOR_ADJUSTMENT } from "../src/types/model-color-adjustment";

// No env file or live provider: all writes below use an in-memory WooCommerce double.
process.env.DATABASE_PROVIDER = "mock";
process.env.STOCK_MONITORING_ENABLED = "true";

function fixture() {
  const meta: Array<[string, unknown]> = [
    ["available_colors", '["Hitam","Putih"]'], ["available_sizes", '["S","M","L"]'],
    ["industries", '["office"]'], ["moq", 1], ["lead_time", "3 hari"],
    ["fulfillment_type", "ready_stock"], ["transaction_mode", "direct_checkout"],
    ["has_3d_model", true], ["model_3d_url", "/3d/FRM.glb"], ["model_3d_id", "frm-model"],
    ["model_3d_version", "v1"], ["model_3d_source", "manual"], ["model_3d_filename", "FRM.glb"],
    ["quantity_pricing_enabled", false], [BASE_PRICE_META, 100000],
  ];
  let product: WooCommerceProduct = {
    id: 900, name: "Kemeja Formal FRM", slug: "frm", sku: "FRM", status: "publish", type: "simple",
    description: "Kemeja formal", short_description: "Kemeja FRM", price: "100000", regular_price: "100000", sale_price: "",
    images: [{ id: 11, src: "https://images.example/hitam.jpg" }, { id: 12, src: "https://images.example/putih.jpg" }],
    attributes: [{ id: 1, name: "Warna", slug: "pa_warna", options: ["Hitam", "Putih"], variation: false }, { id: 2, name: "Ukuran", slug: "pa_ukuran", options: ["S", "M", "L"], variation: false }],
    categories: [{ id: 1, name: "Kemeja", slug: "kemeja" }], meta_data: meta.map(([key, value]) => ({ key, value })),
  };
  const rows: WooCommerceProductVariation[] = [];
  let nextId = 1000;
  let writes = 0;
  let failSku = "";
  const mergeMeta = (old: WooCommerceProduct["meta_data"], incoming: WooCommerceProduct["meta_data"]) => [
    ...(old ?? []).filter((row) => !(incoming ?? []).some((entry) => entry.key === row.key)), ...(incoming ?? []),
  ];
  const materialize = (id: number, input: WooCommerceProductVariationWritePayload, existing?: WooCommerceProductVariation): WooCommerceProductVariation => {
    if (input.sku && input.sku === failSku) throw new Error("Simulated duplicate SKU/provider failure");
    const image = input.image?.id ? product.images?.find((image) => image.id === input.image!.id) : existing?.image;
    return { ...existing, ...input, id, sku: input.sku ?? existing?.sku ?? "", image, meta_data: mergeMeta(existing?.meta_data, input.meta_data) };
  };
  const source = {
    getProductById: async () => structuredClone(product),
    getProducts: async () => [structuredClone(product)],
    getProductVariations: async () => structuredClone(rows),
    updateProduct: async (_id: string | number, input: WooCommerceProductWritePayload) => {
      writes++;
      const attributes = input.attributes?.map((attribute) => ({ ...product.attributes?.find((old) => old.id === attribute.id), ...attribute })) as WooCommerceProduct["attributes"];
      product = { ...product, ...input, categories: product.categories, tags: product.tags, images: product.images, attributes: attributes ?? product.attributes, meta_data: mergeMeta(product.meta_data, input.meta_data) };
      return structuredClone(product);
    },
    createProductVariation: async (_id: string | number, input: WooCommerceProductVariationWritePayload) => {
      writes++;
      const row = materialize(nextId++, input);
      rows.push(row);
      return structuredClone(row);
    },
    updateProductVariation: async (_id: string | number, id: string | number, input: WooCommerceProductVariationWritePayload) => {
      writes++;
      const index = rows.findIndex((row) => row.id === Number(id));
      assert(index >= 0);
      rows[index] = materialize(Number(id), input, rows[index]);
      return structuredClone(rows[index]!);
    },
  };
  return { source, rows, get product() { return product; }, get writes() { return writes; }, setFail: (sku: string) => { failSku = sku; } };
}

const input = {
  variants: [
    { color: "Hitam", sku: "FRM-Hitam", imageSrc: "https://images.example/hitam.jpg", stockQuantity: 5, fabricColor: "#242424", modelAdjustment: { ...DEFAULT_MODEL_COLOR_ADJUSTMENT, brightness: 0.65, exposure: 0.85 } },
    { color: "Putih", sku: "FRM-Putih", imageSrc: "https://images.example/putih.jpg", stockQuantity: null },
  ], defaultColor: "Putih",
};

async function run() {
  const whiteBefore = structuredClone(input.variants[1]!);
  let drafts = updateVariantModelAdjustment(input.variants, input.variants[0]!, { hue: 12 }, DEFAULT_MODEL_COLOR_ADJUSTMENT);
  assert.equal(drafts[0]?.modelAdjustment?.brightness, 0.65, "changing one slider preserves the color's other settings");
  assert.deepEqual(drafts[1], whiteBefore, "adjusting black must not alter white");
  drafts = updateVariantModelAdjustment(drafts, drafts[1]!, { brightness: 1.2 }, DEFAULT_MODEL_COLOR_ADJUSTMENT);
  assert.equal(drafts[0]?.modelAdjustment?.hue, 12, "switching colors preserves black's adjustment");
  drafts = updateVariantModelAdjustment(drafts, drafts[0]!, DEFAULT_MODEL_COLOR_ADJUSTMENT, DEFAULT_MODEL_COLOR_ADJUSTMENT);
  assert.equal(drafts[0]?.modelAdjustment?.hue, 0);
  assert.equal(drafts[1]?.modelAdjustment?.brightness, 1.2, "reset black leaves white untouched");
  assert.equal(readVariantModelAdjustment("invalid json"), undefined);
  assert.equal(readVariantModelAdjustment({ brightness: 1 }), undefined);
  const f = fixture();
  const payload = adminColorVariantsSchema.parse(input);
  assert(!adminColorVariantsSchema.safeParse({ ...input, variants: [input.variants[0], { ...input.variants[1], sku: "frm-hitam" }] }).success, "case-insensitive duplicate SKUs must fail");
  assert(!adminColorVariantsSchema.safeParse({ ...input, defaultColor: "Navy" }).success);
  assert(!adminColorVariantsSchema.safeParse({ ...input, variants: [{ ...input.variants[0], stockQuantity: -1 }] }).success);
  assert(!adminColorVariantsSchema.safeParse({ ...input, variants: [{ ...input.variants[0], fabricColor: "red" }] }).success);
  assert(!adminColorVariantsSchema.safeParse({ ...input, defaultColor: "Hitam", variants: [{ ...input.variants[0], modelAdjustment: { ...DEFAULT_MODEL_COLOR_ADJUSTMENT, exposure: 99 } }] }).success);
  assert.equal(adminColorVariantsSchema.parse({ ...input, defaultColor: "Hitam", variants: [{ ...input.variants[0], fabricColor: "#ABCDEF" }] }).variants[0]?.fabricColor, "#abcdef");
  await assert.rejects(saveColorVariants(900, { ...payload, variants: [{ ...payload.variants[0]!, imageSrc: "https://foreign.example/image.jpg" }, payload.variants[1]!] }, f.source), /Foto warna/);
  assert.equal(f.writes, 0, "foreign images must fail before writes");
  await assert.rejects(saveColorVariants(900, { ...payload, variants: [{ ...payload.variants[0]!, id: 123 }, payload.variants[1]!] }, f.source), /ID varian/);
  await assert.rejects(saveColorVariants(900, { ...payload, variants: [{ ...payload.variants[0]!, sku: "FRM" }, payload.variants[1]!] }, f.source), /SKU varian/);

  const variants = await saveColorVariants(900, payload, f.source);
  assert.equal(f.product.type, "variable");
  assert.equal(f.rows.length, 2);
  assert.equal(f.product.attributes?.[0]?.variation, true);
  assert.equal(f.product.attributes?.[1]?.variation, false);
  assert.equal(f.rows[0]?.image?.id, 11);
  assert.equal(f.rows[1]?.image?.id, 12);
  assert.equal(f.rows[0]?.manage_stock, true);
  assert.equal(f.rows[1]?.manage_stock, false);
  assert(getMetaBoolean(f.product.meta_data ?? [], COLOR_VARIANTS_READY_META, false));
  await saveColorVariants(900, { ...payload, variants }, f.source);
  assert.equal(f.rows.length, 2, "repeat saves must not duplicate variations");

  const raw = await withLiveColorVariants(f.product, f.source);
  const product = mapWooCommerceProductToOfissioProduct(raw);
  assert.equal(product.colorVariants?.[0]?.fabricColor, "#242424", "3D swatch survives native WooCommerce save and live read");
  assert.equal(product.colorVariants?.[1]?.fabricColor, undefined, "older variants without a swatch remain compatible");
  assert.equal(product.colorVariants?.[0]?.modelAdjustment?.brightness, 0.65, "per-color adjustment survives save and live reload");
  assert.equal(product.colorVariants?.[0]?.modelAdjustment?.exposure, 0.85);
  assert.equal(product.colorVariants?.[1]?.modelAdjustment, undefined, "unadjusted colors keep the product defaults");
  f.rows[0]!.stock_quantity = 1;
  const liveStock = mapWooCommerceProductToOfissioProduct(await withLiveColorVariants(f.product, f.source));
  assert.equal(liveStock.colorVariants?.[0]?.stockQuantity, 1, "detail/checkout must read native stock rather than cached metadata");
  f.rows[0]!.stock_quantity = 5;
  assert.equal(product.defaultColor, "Putih");
  assert.equal(product.priceFrom, 100000);
  assert(validateProductForCart(product).ok);
  assert.equal(colorVariantSnapshot(product, "Putih").sku, "FRM-Putih");
  assert.equal(colorVariantGallery(product, "Putih")[0]?.src, input.variants[1]?.imageSrc);
  assert.equal(colorVariantGallery(product, "Hitam")[0]?.src, input.variants[0]?.imageSrc);
  assert.equal(colorVariantGallery(product, "Putih").length, 2);
  assert(colorVariantIssue(product, "Navy"));
  assert(colorVariantIssue({ ...product, colorVariantsReady: false }, "Hitam"));
  assert(colorVariantIssue({ ...product, colorVariants: [] }, "Hitam"));

  // Cart must replace the SKU/photo when an existing line changes color.
  useCartStore.setState({ items: [] });
  const sizes = { ...emptySizeMatrix(), S: 2, M: 4 };
  assert(useCartStore.getState().add({ product, color: "Hitam", sizes }).ok);
  const hitam = useCartStore.getState().items[0]!;
  assert.equal(hitam.sku, "FRM-Hitam");
  assert.equal(hitam.variationId, variants[0]?.id);
  assert(useCartStore.getState().add({ product, color: "Putih", sizes, replaceLineId: hitam.id }).ok);
  const putih = useCartStore.getState().items[0]!;
  assert.equal(putih.sku, "FRM-Putih");
  assert.equal(putih.image, input.variants[1]?.imageSrc);
  assert.equal(putih.parentSku, "FRM");

  // The server rebuilds SKU and variation ID from color, never from browser snapshots.
  const originalRead = productServerService.getProductById;
  productServerService.getProductById = async () => product;
  try {
    const cart = await syncCheckoutCart({ companyId: "company-test", userId: "user-test", items: [{ productId: product.id, selectedColor: "Putih", sizeMatrix: sizes, customization: null, embroideryPlacements: [] }] });
    assert.equal(cart.items[0]?.sku, "FRM-Putih");
    assert.equal(cart.items[0]?.variationId, variants[1]?.id);
    assert.equal((await getValidatedCheckoutCart(cart.id, "company-test", "user-test")).items[0]?.image, input.variants[1]?.imageSrc);
    const quoteItems = buildQuotationItems(cart.items, "quote-test", new Date().toISOString());
    assert.equal(quoteItems[0]?.itemSnapshot.variationId, variants[1]?.id);
    const order = { id: "order-test", companyId: "company-test", items: cart.items, calculation: { shippingFee: 0 } } as PaymentOrderRecord;
    const mapped = mapPaymentOrderToWooCommerceOrder({ order, payment: { status: "waiting_payment", provider: "manual" } as unknown as PaymentRecord });
    assert.equal(mapped.line_items[0]?.product_id, 900);
    assert.equal(mapped.line_items[0]?.variation_id, variants[1]?.id);
    assert.equal(mapped.line_items[0]?.sku, "FRM-Putih");
    const requirements = getOrderStockRequirement({ ...order, items: [{ ...cart.items[0]!, sku: "FRM-Hitam", variationId: variants[0]?.id }] });
    assert.equal(requirements.length, 1, "color stock must aggregate sizes");
    assert.equal(requirements[0]?.stockSku, "FRM-HITAM");
    assert.equal(requirements[0]?.parentSku, "FRM");
    assert.equal(requirements[0]?.requiredQty, 6);
    const matrix = await getWooSizeStockMatrix("FRM", f.source);
    assert.equal(matrix.rows[0]?.sizeLabel, null, "Hitam must not be interpreted as a size");
    assert.equal((await getWooStockBySku("FRM-Hitam", f.source))?.stockQuantity, 5);
    const comparison = await compareOrderRequirementWithWooStock({ ...order, items: [{ ...cart.items[0]!, sku: "FRM-Hitam", variationId: variants[0]?.id }] }, f.source);
    assert.equal(comparison.requirements[0]?.shortageQty, 1);
  } finally {
    productServerService.getProductById = originalRead;
  }

  const partial = fixture();
  partial.setFail("FRM-Putih");
  await assert.rejects(saveColorVariants(900, payload, partial.source), /Simulated/);
  assert.equal(partial.rows.length, 1);
  assert.equal(getMetaBoolean(partial.product.meta_data ?? [], COLOR_VARIANTS_READY_META, true), false);
  partial.setFail("");
  await saveColorVariants(900, payload, partial.source);
  assert.equal(partial.rows.length, 2, "retry after partial failure must reuse created row");

  // Do not overwrite imported size variations.
  const legacy = fixture();
  legacy.rows.push({ id: 777, sku: "FRM-S", status: "publish", attributes: [{ name: "Ukuran", option: "S" }] });
  await assert.rejects(saveColorVariants(900, payload, legacy.source), /sistem lain/);
  assert.equal(legacy.writes, 0);

  // Removing a color keeps its historical variation private.
  await f.source.updateProduct(900, { meta_data: [{ key: "available_colors", value: '["Hitam"]' }] });
  await saveColorVariants(900, { variants: [variants[0]!], defaultColor: "Hitam" }, f.source);
  assert.equal(f.rows.find((row) => row.sku === "FRM-Putih")?.status, "private");
  assert.equal((await getWooSizeStockMatrix("FRM", f.source)).rows.length, 1);
  // Disabling keeps old variations private for historical order references.
  await saveColorVariants(900, { variants: [], defaultColor: "" }, f.source);
  assert.equal(f.rows.length, 2);
  assert(f.rows.every((row) => row.status === "private"));
  assert.equal(f.product.type, "simple");
  assert.equal(getMetaBoolean(f.product.meta_data ?? [], COLOR_VARIANTS_ENABLED_META, true), false);
  assert(f.rows.every((row) => getMetaBoolean(row.meta_data ?? [], COLOR_VARIANT_MARKER, false)));
  console.log("PASS: color variant validation, Woo save/read/retry, photo selection, cart replacement, server checkout, quotation, order variation ID and color stock.");
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
