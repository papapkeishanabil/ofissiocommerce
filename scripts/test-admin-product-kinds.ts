import assert from "node:assert/strict";
import { woocommerceClient } from "../src/features/products/woocommerce/woocommerce.client";
import { createAdminWooCommerceProduct, updateAdminWooCommerceProduct } from "../src/features/products/woocommerce/woocommerce-product-admin.service";
import { adminWooProductPayloadSchema } from "../src/features/products/woocommerce/woocommerce-product-management.validation";
import type { WooCommerceProduct, WooCommerceProductWritePayload } from "../src/features/products/woocommerce/woocommerce.types";

process.env.DATABASE_PROVIDER = "mock";
const original = { ...woocommerceClient };
let nextId = 3000;
const products = new Map<number, WooCommerceProduct>();
const attributes = ["Warna", "Ukuran", "Material", "Gender", "Tipe Lengan", "Safety Features"].map((name, index) => ({ id: index + 1, name, slug: ["warna", "ukuran", "material", "gender", "tipe-lengan", "safety-features"][index]! }));
const payload = {
  productKind: "variable", modelCode: "SN", sku: "", name: "Kemeja SN Green Series", regularPrice: 85000,
  weightGram: 250, lengthCm: 30, widthCm: 20, heightCm: 3, status: "draft", description: "", shortDescription: "",
  categoryIds: [1], industries: ["office"], imageUrls: [], colors: ["Merah"], sizes: ["OS"], materials: [], gender: "women", sleeveType: "long", safetyFeatures: [],
  moq: 1, leadTimeDays: 3, fulfillmentType: "ready_stock", transactionMode: "direct_checkout", alwaysOrderable: true, replenishmentPolicy: "internal_warning_only", processRoute: "fulfillment",
  supportsEmbroidery: false, supportsScreenPrinting: false, supportsDtf: false, embroideryZones: [], quantityPricingEnabled: false, quantityPricingTiers: [],
};
function materialize(id: number, input: WooCommerceProductWritePayload): WooCommerceProduct {
  return { id, name: input.name!, sku: input.sku!, slug: `product-${id}`, status: input.status!, type: input.type,
    description: input.description!, short_description: input.short_description!, regular_price: input.regular_price!, price: input.regular_price!, sale_price: "", images: [],
    categories: [{ id: 1, name: "Kemeja", slug: "kemeja" }], attributes: input.attributes?.map(a => ({ id: a.id ?? 0, name: a.name ?? attributes.find(attr => attr.id === a.id)?.name ?? "", slug: attributes.find(attr => attr.id === a.id)?.slug ?? "", ...a })), meta_data: input.meta_data,
  };
}
async function run() {
  woocommerceClient.getAttributes = async () => structuredClone(attributes);
  woocommerceClient.getAttributeTerms = async () => ["Merah", "OS", "men", "women", "unisex", "short", "long"].map((name, index) => ({ id: index + 1, name, slug: name.toLowerCase() }));
  woocommerceClient.getProductById = async id => structuredClone(products.get(Number(id))!);
  woocommerceClient.getProductVariations = async () => [];
  woocommerceClient.createProduct = async input => {
    const row = materialize(nextId++, input); products.set(row.id, row); return structuredClone(row);
  };
  try {
    assert(!adminWooProductPayloadSchema.safeParse({ ...payload, productKind: "simple" }).success, "simple needs a real SKU");
    assert(!adminWooProductPayloadSchema.safeParse({ ...payload, modelCode: "" }).success, "variable needs a model code");
    const first = await createAdminWooCommerceProduct({ payload: adminWooProductPayloadSchema.parse({ ...payload, sizeChartId: "sasienala-sn-basic" }), actorId: "test" });
    assert.equal(first.ofissioMeta.sizeChartId, "sasienala-sn-basic", "chosen chart survives write and detail hydration");
    assert.equal(products.get(first.id)?.meta_data?.find(meta => meta.key === "size_chart_id")?.value, "sasienala-sn-basic");
    const countBeforeInvalid = products.size;
    await assert.rejects(createAdminWooCommerceProduct({ payload: adminWooProductPayloadSchema.parse({ ...payload, gender: "men", sizeChartId: "sasienala-sn-basic" }), actorId: "test" }), /standar ukuran/i);
    assert.equal(products.size, countBeforeInvalid, "wrong-gender chart must be rejected before provider write");
    const second = await createAdminWooCommerceProduct({ payload: adminWooProductPayloadSchema.parse({ ...payload, name: "Kemeja SN Blue Series" }), actorId: "test" });
    assert.equal(first.modelCode, "SN"); assert.equal(second.modelCode, "SN");
    assert.notEqual(first.sku, second.sku, "same model must receive distinct automatic catalog SKUs");
    assert(first.sku.startsWith("OFS-"));
    const simplePayload = adminWooProductPayloadSchema.parse({ ...payload, productKind: "simple", sku: "KL-003" });
    const simple = await createAdminWooCommerceProduct({ payload: simplePayload, actorId: "test" });
    assert.equal(simple.sku, "KL-003"); assert.equal(products.get(simple.id)?.type, "simple");
    const existing = products.get(first.id)!; existing.variations = [42];
    await assert.rejects(updateAdminWooCommerceProduct({ id: first.id, payload: simplePayload, actorId: "test" }), /sudah memiliki varian/);
    assert.equal(existing.type, "variable", "stored variations cannot be silently disabled by changing product kind");
    console.log("PASS: repeated model codes, unique automatic catalog SKUs, simple direct SKU, required fields and stored-variant conversion protection.");
  } finally { Object.assign(woocommerceClient, original); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
