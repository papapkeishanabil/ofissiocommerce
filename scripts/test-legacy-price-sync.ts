import assert from "node:assert/strict";
import { syncLegacyVariantPrices } from "../src/features/products/woocommerce/legacy-price-sync.service";
import { uniformLiveOfferPrice } from "../src/features/products/product-schema-offer";
import { calculateQuantityTierPrice } from "../src/features/products/quantity-pricing";
import type { WooCommerceProduct, WooCommerceProductVariation } from "../src/features/products/woocommerce/woocommerce.types";
import type { VariantSource } from "../src/features/products/woocommerce/color-variants.service";
import { woocommerceClient } from "../src/features/products/woocommerce/woocommerce.client";
import { updateAdminWooCommerceProduct } from "../src/features/products/woocommerce/woocommerce-product-admin.service";
import { adminWooProductPayloadSchema } from "../src/features/products/woocommerce/woocommerce-product-management.validation";

async function testAdminSave() {
  process.env.DATABASE_PROVIDER = "mock";
  const original = { ...woocommerceClient };
  const f = fixture();
  const attrs = ["warna", "ukuran", "material", "gender", "tipe-lengan", "safety-features"].map((slug, i) => ({ id: i + 1, name: slug, slug }));
  let parent = { ...f.product(), name: "Test legacy", sku: "TEST", slug: "test-legacy", status: "draft", price: "125000", sale_price: "", images: [], categories: [], attributes: [{ id: 2, name: "Ukuran", slug: "pa_ukuran", options: ["S", "3XL"], variation: true }], meta_data: [...(f.product().meta_data ?? []), { key: "available_sizes", value: '["S","3XL"]' }, { key: "available_colors", value: '["Putih"]' }] } as WooCommerceProduct;
  const payload = adminWooProductPayloadSchema.parse({
    name: parent.name, sku: parent.sku, regularPrice: 140000, weightGram: 250, lengthCm: 30, widthCm: 20, heightCm: 3,
    status: "draft", description: "", shortDescription: "", categoryIds: [1], industries: ["office"], imageUrls: [],
    colors: ["Putih"], sizes: ["S", "3XL"], materials: [], gender: "men", sleeveType: "short", safetyFeatures: [],
    moq: 1, leadTimeDays: 3, fulfillmentType: "ready_stock", transactionMode: "direct_checkout", alwaysOrderable: true,
    replenishmentPolicy: "internal_warning_only", processRoute: "fulfillment", supportsEmbroidery: false,
    supportsScreenPrinting: false, supportsDtf: false, embroideryZones: [], quantityPricingEnabled: false, quantityPricingTiers: [],
  });
  Object.assign(woocommerceClient, {
    getProductById: async () => structuredClone(parent), getAttributes: async () => structuredClone(attrs),
    getAttributeTerms: async () => ["Putih", "S", "3XL", "men", "women", "unisex", "short", "long"].map((name, id) => ({ id, name })),
    getProducts: async () => [], getProductVariations: f.source.getProductVariations,
    updateProductVariation: f.source.updateProductVariation,
    updateProduct: async (_id: number, patch: Partial<WooCommerceProduct>) => {
      parent = { ...parent, ...patch, attributes: patch.attributes?.map(attr => ({ ...attr, name: attr.name || attrs.find(a => a.id === attr.id)?.name || "", slug: attrs.find(a => a.id === attr.id)?.slug ?? "" })) ?? parent.attributes, meta_data: [...(parent.meta_data ?? []).filter(m => !patch.meta_data?.some(n => n.key === m.key)), ...(patch.meta_data ?? [])] };
      return structuredClone(parent);
    },
  });
  try {
    const result = await updateAdminWooCommerceProduct({ id: parent.id, payload, actorId: "price-sync-test" });
    assert.equal(result.price, 140000);
    assert(f.rows().every(row => row.regular_price === "140000"), "Actual admin save updates existing native prices");
    assert.equal(uniformLiveOfferPrice({ ...parent, status: "publish" }, f.rows()), 140000);
    assert(f.rows().every(row => row.stock_quantity === 8 + row.id - 1));
  } finally { Object.assign(woocommerceClient, original); }
}

function fixture() {
  let product = { id: 828, type: "variable", status: "publish", regular_price: "125000", meta_data: [{ key: "ofissio_stock_variants_ready", value: true }] } as WooCommerceProduct;
  let rows = [125000, 130000].map((price, i) => ({ id: i + 1, status: "publish", sku: `TEST-${i}`, regular_price: String(price), price: String(price), sale_price: "", manage_stock: true, stock_quantity: 8 + i, stock_status: "instock", attributes: [{ name: "Ukuran", option: i ? "3XL" : "S" }] })) as WooCommerceProductVariation[];
  const writes: unknown[] = []; let fail = false;
  const source = {
    getProductVariations: async () => structuredClone(rows),
    updateProduct: async (_id: number, patch: Partial<WooCommerceProduct>) => {
      product = { ...product, meta_data: [...(product.meta_data ?? []).filter(m => !patch.meta_data?.some(n => n.key === m.key)), ...(patch.meta_data ?? [])] };
      return product;
    },
    updateProductVariation: async (_id: number, id: number, patch: Partial<WooCommerceProductVariation>) => {
      if (fail) throw Error("provider failure");
      writes.push(patch); rows = rows.map(row => row.id === id ? { ...row, ...patch, price: patch.regular_price! } : row);
      return rows.find(row => row.id === id)!;
    },
  } as unknown as VariantSource;
  return { source, writes, product: () => product, rows: () => rows, fail: (value: boolean) => { fail = value; } };
}

async function main() {
  const f = fixture(); const before = f.rows().map(({ regular_price: _regular, price: _price, ...row }) => row);
  await syncLegacyVariantPrices(f.product(), 125000, f.source);
  assert.deepEqual(f.writes, [{ regular_price: "125000", attributes: f.rows()[1]!.attributes }], "Only stale regular prices change; identities stay identical");
  assert.deepEqual(f.rows().map(({ regular_price: _regular, price: _price, ...row }) => row), before, "Keep stock, SKUs and attributes");
  assert.equal(uniformLiveOfferPrice(f.product(), f.rows()), 125000);
  assert.equal(calculateQuantityTierPrice({ regularPrice: 125000, totalQty: 1 }).unitPrice, 125000);
  await syncLegacyVariantPrices(f.product(), 125000, f.source);
  assert.equal(f.writes.length, 1, "Repeated save is idempotent");

  const failed = fixture(); failed.fail(true);
  await assert.rejects(syncLegacyVariantPrices(failed.product(), 120000, failed.source));
  assert.equal(failed.product().meta_data?.find(m => m.key === "ofissio_stock_variants_ready")?.value, false);
  failed.fail(false); await syncLegacyVariantPrices(failed.product(), 120000, failed.source);
  assert(failed.rows().every(row => row.price === "120000"));
  assert.equal(failed.product().meta_data?.find(m => m.key === "ofissio_stock_variants_ready")?.value, true, "Retry restores readiness after readback");

  for (const key of ["ofissio_product_kind", "ofissio_color_variants_enabled"]) {
    const explicit = fixture();
    await syncLegacyVariantPrices({ ...explicit.product(), meta_data: [{ key, value: key.endsWith("kind") ? "variable" : true }] }, 90000, explicit.source);
    assert.equal(explicit.writes.length, 0, "Preserve explicit variant/color pricing");
    assert.equal(explicit.rows()[1]?.price, "130000");
  }
  const promo = fixture(); promo.rows()[0]!.sale_price = "100000";
  await assert.rejects(syncLegacyVariantPrices(promo.product(), 120000, promo.source));
  assert.equal(promo.writes.length, 0, "Never overwrite a separate promotion");
  await testAdminSave();
  console.log("PASS: admin price sync, unchanged inventory, idempotence, failure/retry, explicit variant prices and promotion protection");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
