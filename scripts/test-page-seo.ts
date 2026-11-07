import assert from "node:assert/strict";
import { pageSeoSchema, emptyPageSeo, readProductSeo, PRODUCT_SEO_META, effectivePageSeo, automaticPageSeo } from "../src/features/seo/page-seo";
import { woocommerceClient } from "../src/features/products/woocommerce/woocommerce.client";
import { createAdminWooCommerceProduct, updateAdminWooCommerceProduct, getAdminWooCommerceProduct } from "../src/features/products/woocommerce/woocommerce-product-admin.service";
import { adminWooProductPayloadSchema } from "../src/features/products/woocommerce/woocommerce-product-management.validation";
import { mapWooCommerceProductToOfissioProduct } from "../src/features/products/product.mapper";
import { productSearchMetadata, productSearchDescription } from "../src/features/seo/product-metadata";
import { createCatalogCategory, updateCatalogCategory, listCatalogCategories } from "../src/features/catalog-taxonomy/catalog-taxonomy.service";
import { categoryCreateSchema } from "../src/features/catalog-taxonomy/catalog-taxonomy.validation";
import { getSiteContent, updateSiteContent } from "../src/features/site-content/site-content.service";
import { siteContentPayloadSchema } from "../src/features/site-content/site-content.validation";
import { defaultInspirationPage, resolveInspirationPage } from "../src/features/site-content/industry-inspiration.content";
import { INSPIRATION_PAGES } from "../src/features/site-content/industry-inspiration.routes";
import { industryPageMetadata } from "../src/features/seo/industry-metadata";
import type { IndustriSectionData } from "../src/features/site-content/content.schema";
import type { WooCommerceProduct, WooCommerceProductWritePayload, WooCommerceCategory } from "../src/features/products/woocommerce/woocommerce.types";

process.env.DATABASE_PROVIDER = "mock";
const original = { ...woocommerceClient };
let product: WooCommerceProduct;
let category: WooCommerceCategory = { id: 901, name: "Koleksi Uji", slug: "koleksi-uji", description: "Ringkasan kategori asli.", count: 1 };
const seo = pageSeoSchema.parse({ primaryKeyword: "target internal rahasia", relatedKeywords: ["pendukung internal"], title: "Judul SEO khusus", description: "Deskripsi SEO khusus." });
const attrs = ["Warna", "Ukuran", "Material", "Gender", "Tipe Lengan", "Safety Features"].map((name, i) => ({ id: i + 1, name, slug: ["warna", "ukuran", "material", "gender", "tipe-lengan", "safety-features"][i]! }));
function materialize(input: WooCommerceProductWritePayload) {
  product = { ...product, ...input, id: 901, name: input.name ?? product?.name, slug: input.slug || product?.slug || "produk-uji", sku: input.sku ?? product?.sku,
    price: input.regular_price ?? product?.price, regular_price: input.regular_price ?? product?.regular_price,
    description: input.description ?? product?.description, short_description: input.short_description ?? product?.short_description,
    categories: [category], images: [], attributes: input.attributes?.map(a => ({ ...a, id: a.id ?? 0, name: attrs.find(row => row.id === a.id)?.name ?? a.name ?? "" })),
    meta_data: [...(product?.meta_data ?? []).filter(old => !input.meta_data?.some(row => row.key === old.key)), ...(input.meta_data ?? [])],
  } as WooCommerceProduct;
  return structuredClone(product);
}
async function main() {
  woocommerceClient.getAttributes = async () => attrs;
  woocommerceClient.getAttributeTerms = async () => ["Merah", "OS", "unisex", "short"].map((name, i) => ({ id: i + 1, name, slug: name.toLowerCase() }));
  woocommerceClient.createAttributeTerm = async (_id, input) => ({ id: 999, name: input.name, slug: input.name.toLowerCase() });
  woocommerceClient.getProductVariations = async () => [];
  woocommerceClient.getProductById = async () => structuredClone(product);
  woocommerceClient.createProduct = async input => materialize(input);
  woocommerceClient.updateProduct = async (_id, input) => materialize(input);
  woocommerceClient.getCategories = async () => [structuredClone(category)];
  woocommerceClient.createCategory = async input => (category = { ...category, ...input });
  woocommerceClient.updateCategory = async (_id, input) => (category = { ...category, ...input });
  try {
    assert.deepEqual(pageSeoSchema.parse({ ...seo, relatedKeywords: [" a ", "", "a"] }).relatedKeywords, ["a"]);
    assert(!pageSeoSchema.safeParse({ ...seo, title: "a".repeat(241) }).success);
    const payload = adminWooProductPayloadSchema.parse({ productKind: "simple", name: "Produk Asli", slug: "produk-uji", sku: "UJI", regularPrice: 85000,
      weightGram: 250, lengthCm: 30, widthCm: 20, heightCm: 3, status: "draft", description: "Deskripsi produk asli.", shortDescription: "Ringkasan produk asli.",
      categoryIds: [901], industries: ["office"], imageUrls: [], colors: ["Merah"], sizes: ["OS"], materials: [], gender: "unisex", sleeveType: "short", safetyFeatures: [],
      moq: 1, leadTimeDays: 3, fulfillmentType: "ready_stock", transactionMode: "direct_checkout", alwaysOrderable: true, replenishmentPolicy: "internal_warning_only", processRoute: "fulfillment",
      supportsEmbroidery: false, supportsScreenPrinting: false, supportsDtf: false, embroideryZones: [], quantityPricingEnabled: false, quantityPricingTiers: [], seo });
    await createAdminWooCommerceProduct({ payload, actorId: "test" });
    assert.deepEqual((await getAdminWooCommerceProduct(901)).seo, seo);
    assert.equal(productSearchMetadata(mapWooCommerceProductToOfissioProduct(product)).description, seo.description);
    assert(!JSON.stringify(mapWooCommerceProductToOfissioProduct(product).seo).includes(seo.primaryKeyword));
    const preserved = { ...payload }; delete preserved.seo;
    await updateAdminWooCommerceProduct({ id: 901, payload: preserved, actorId: "test" });
    assert.equal((await getAdminWooCommerceProduct(901)).seo?.title, seo.title, "old API clients preserve overrides");
    await updateAdminWooCommerceProduct({ id: 901, payload: { ...payload, seo: emptyPageSeo() }, actorId: "test" });
    assert.equal(productSearchMetadata(mapWooCommerceProductToOfissioProduct(product)).description, productSearchDescription(mapWooCommerceProductToOfissioProduct(product)));
    assert.equal(product.name, payload.name); assert.equal(product.slug, payload.slug); assert.equal(product.description, payload.description);
    await createAdminWooCommerceProduct({ payload: preserved, actorId: "test" });
    assert.equal(productSearchMetadata(mapWooCommerceProductToOfissioProduct(product)).description, productSearchDescription(mapWooCommerceProductToOfissioProduct(product)), "new pages without SEO use real source copy");
    assert.equal(readProductSeo([{ key: "_yoast_wpseo_title", value: "Judul lama manual" }]).title, "Judul lama manual");
    assert.equal(readProductSeo([{ key: "_yoast_wpseo_title", value: "lama" }, { key: PRODUCT_SEO_META, value: emptyPageSeo() }]).title, "");
    await createCatalogCategory({ payload: categoryCreateSchema.parse({ ...category, seo }), actorId: "test" });
    assert.deepEqual((await listCatalogCategories())[0]?.seo, seo);
    await updateCatalogCategory({ id: 901, payload: { description: category.description }, actorId: "test" });
    assert.equal((await listCatalogCategories())[0]?.seo?.title, seo.title);
    await updateCatalogCategory({ id: 901, payload: { seo: emptyPageSeo() }, actorId: "test" });
    const read = (await listCatalogCategories())[0]!;
    assert.equal(effectivePageSeo(read.seo, automaticPageSeo(read.name, read.description)).description, category.description);
    const state = await getSiteContent();
    const data = state.sections.find(s => s.key === "industri")!.data as IndustriSectionData;
    for (const page of INSPIRATION_PAGES) {
      const fresh = resolveInspirationPage(page, data);
      assert.ok(industryPageMetadata(fresh).description, `legacy automatic ${page.slug}`);
    }
    const fresh = { ...defaultInspirationPage("Kesehatan"), seo };
    data.inspirationPages = [fresh];
    await updateSiteContent(siteContentPayloadSchema.parse({ section: "industri", data }), "test");
    const saved = (await getSiteContent()).sections.find(s => s.key === "industri")!.data as IndustriSectionData;
    assert.deepEqual(saved.inspirationPages[0]?.seo, seo);
    assert.deepEqual(industryPageMetadata(saved.inspirationPages[0]!).title, { absolute: seo.title });
    saved.inspirationPages[0]!.seo = emptyPageSeo();
    await updateSiteContent(siteContentPayloadSchema.parse({ section: "industri", data: saved }), "test");
    const cleared = (await getSiteContent()).sections.find(s => s.key === "industri")!.data as IndustriSectionData;
    assert.equal(industryPageMetadata(cleared.inspirationPages[0]!).description, fresh.lede);
    console.log("PASS: product Woo write/read/mapper, category persistence, industry save/read, all 20 industry fallbacks, legacy manual preservation, reset, validation, internal keyword projection; no live writes.");
  } finally { Object.assign(woocommerceClient, original); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
