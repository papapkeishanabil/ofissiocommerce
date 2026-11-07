import assert from "node:assert/strict";
import { colorSellingFixture } from "../test-fixtures/product-variants/color-selling-fixture";
import { INACTIVE_PRODUCT_COLORS_META, readInactiveProductColors, saleableColorVariationRows } from "../src/features/products/product-color-selling";
import { woocommerceClient } from "../src/features/products/woocommerce/woocommerce.client";
import { updateAdminWooCommerceProduct } from "../src/features/products/woocommerce/woocommerce-product-admin.service";
import { adminWooProductPayloadSchema } from "../src/features/products/woocommerce/woocommerce-product-management.validation";
import { mapWooCommerceProductToOfissioProduct } from "../src/features/products/product.mapper";
import { withLiveColorVariants } from "../src/features/products/woocommerce/color-variants.service";
import { saveProductVariants } from "../src/features/products/woocommerce/product-variants.service";
import { colorVariantIssue, COLOR_VARIANT_MARKER, readColorVariants } from "../src/features/products/color-variants";
import { mapNativeColorSizeVariants, selectColorSizeVariants } from "../src/features/products/color-size-variants";
import { linkedVariantSelection } from "../src/features/products/product-variant-links";
import { validateProductForCart, validateProductForCatalog } from "../src/features/products/product.validation";
import { getProductReadiness } from "../src/features/products/woocommerce/woocommerce-product-readiness";
import { selectProductVariants } from "../src/features/products/product-variants";
import { productServerService } from "../src/features/products/product.server-service";
import { syncCheckoutCart, getValidatedCheckoutCart } from "../src/features/checkout/checkout-cart.service";
import { emptySizeMatrix } from "../src/types/cart";
import { useCartStore } from "../src/stores/cart-store";
import { merchantProduct } from "../src/features/products/merchant-feed";
import { mockProductRepository } from "../src/features/products/repositories/mock-product.repository";

process.env.DATABASE_PROVIDER = "mock";

async function run() {
  const original = { ...woocommerceClient };
  const originalRead = productServerService.getProductById;
  const originalMockRead = mockProductRepository.getProductById;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Unexpected network request in synthetic test"); };
  const fixture = colorSellingFixture();
  let product = fixture.product;
  const rows = fixture.rows;
  const historicalOrder = structuredClone({ sku: rows[0]!.sku, variationId: rows[0]!.id, color: "Apricot", image: rows[0]!.image });
  const retainedInventory = structuredClone(rows);
  const variantWrites: unknown[] = [];
  const mergeMeta = (before = product.meta_data, incoming = product.meta_data) => [...(before ?? []).filter(meta => !incoming?.some(entry => entry.key === meta.key)), ...(incoming ?? [])];
  let dropSalesSetting = false;
  woocommerceClient.getAttributes = async () => ["Warna", "Ukuran", "Material", "Gender", "Tipe Lengan", "Safety Features"].map((name, index) => ({ id: index + 1, name, slug: name.toLowerCase().replace(/ /g, "-") }));
  woocommerceClient.getAttributeTerms = async () => ["Apricot", "Pink", "S", "M", "Toyobo", "men", "women", "unisex", "short", "long"].map((name, index) => ({ id: index + 1, name, slug: name.toLowerCase() }));
  woocommerceClient.getProductById = async () => structuredClone(product);
  woocommerceClient.getProducts = async () => [structuredClone(product)];
  woocommerceClient.getProductVariations = async () => structuredClone(rows);
  woocommerceClient.updateProduct = async (_id, patch) => {
    const meta = dropSalesSetting ? patch.meta_data?.filter(entry => entry.key !== INACTIVE_PRODUCT_COLORS_META) : patch.meta_data;
    const names = ["Warna", "Ukuran", "Material", "Gender", "Tipe Lengan", "Safety Features"];
    product = { ...product, ...patch, tags: product.tags, categories: product.categories, images: product.images, attributes: patch.attributes?.map(attribute => ({ ...attribute, id: attribute.id ?? 0, name: attribute.name ?? names[(attribute.id ?? 1) - 1]!, slug: names[(attribute.id ?? 1) - 1]!.toLowerCase() })) ?? product.attributes, meta_data: mergeMeta(product.meta_data, meta) };
    return structuredClone(product);
  };
  woocommerceClient.updateProductVariation = async (_id, id, patch) => {
    variantWrites.push(patch);
    const index = rows.findIndex(row => row.id === Number(id));
    assert(index >= 0, "must reuse an existing native row");
    const row = rows[index]!;
    rows[index] = { ...row, ...patch, image: patch.image?.id ? product.images?.find(image => image.id === patch.image!.id) : row.image, meta_data: mergeMeta(row.meta_data, patch.meta_data) };
    return structuredClone(rows[index]!);
  };
  woocommerceClient.createProductVariation = async () => { throw new Error("Never create a new SKU for a sales toggle"); };
  const payload = adminWooProductPayloadSchema.parse({
    productKind: "variable", modelCode: "SN", sku: product.sku, name: product.name, regularPrice: 85000,
    weightGram: 250, lengthCm: 30, widthCm: 20, heightCm: 3, status: "publish", description: product.description, shortDescription: product.short_description,
    categoryIds: [1], industries: ["office"], imageUrls: product.images!.map(image => image.src), colors: ["Apricot", "Pink"], sizes: ["S", "M"], materials: ["Toyobo"], gender: "women", sleeveType: "long", safetyFeatures: [],
    moq: 1, leadTimeDays: 3, fulfillmentType: "ready_stock", transactionMode: "direct_checkout", alwaysOrderable: true, replenishmentPolicy: "internal_warning_only", processRoute: "fulfillment",
    supportsEmbroidery: true, supportsScreenPrinting: false, supportsDtf: false, embroideryZones: ["left_chest"], quantityPricingEnabled: false, quantityPricingTiers: [],
  });
  const save = async (inactiveColors?: string[]) => {
    const admin = await updateAdminWooCommerceProduct({ id: product.id, payload: { ...payload, inactiveColors }, actorId: "synthetic-test" });
    await saveProductVariants(product.id, { options: fixture.options, variants: admin.productVariants!, defaultVariantSku: admin.defaultVariantSku! });
    return admin;
  };
  const mapped = async () => mapWooCommerceProductToOfissioProduct(await withLiveColorVariants(product));
  try {
    assert(!adminWooProductPayloadSchema.safeParse({ ...payload, inactiveColors: ["Unknown"] }).success);
    assert(!adminWooProductPayloadSchema.safeParse({ ...payload, inactiveColors: ["Apricot", " apricot "] }).success);
    const sizes = { ...emptySizeMatrix(), S: 1 };
    // The mock source skips live stock-provider calls, while exercising real cart validation.
    productServerService.getProductById = async () => ({ ...await mapped(), source: "mock" });
    let mockCurrent = { ...await mapped(), source: "mock" as const };
    mockProductRepository.getProductById = () => mockCurrent;
    const input = { companyId: "synthetic-color-company", userId: "synthetic-color-user", items: [{ productId: `wc-${product.id}`, selectedColor: "Apricot", selectedOptions: { Warna: "Apricot" }, sizeMatrix: sizes, customization: null, embroideryPlacements: [] }] };
    const previousCart = await syncCheckoutCart(input);
    const admin = await save(["Apricot"]);
    mockCurrent = { ...await mapped(), source: "mock" as const };
    assert.deepEqual(admin.inactiveColors, ["Apricot"]);
    assert.equal(admin.productVariants!.length, 4, "admin retains inactive SKUs for editing and reactivation");
    assert(variantWrites.every(patch => !Object.keys(patch as object).some(key => ["manage_stock", "stock_quantity", "stock_status"].includes(key))));
    assert.deepEqual(rows.map(row => [row.id, row.sku, row.stock_quantity, row.image?.src, row.status]), retainedInventory.map(row => [row.id, row.sku, row.stock_quantity, row.image?.src, row.status]));
    let customer = await mapped();
    assert.deepEqual(customer.colors, ["Pink"]);
    assert.deepEqual(customer.available_colors, ["Pink"]);
    assert.deepEqual(customer.variantOptions?.find(option => option.name === "Warna")?.values, ["Pink"]);
    assert.equal(customer.productVariants?.length, 2);
    assert.equal(customer.defaultColor, "Pink");
    assert.equal(customer.defaultVariantSku, "SN-PINK-S");
    assert.equal(customer.mainImage, "https://images.example/pink.png");
    assert.equal(customer.attributes?.find(attribute => attribute.name === "Warna")?.options.includes("Apricot"), false);
    assert.equal(customer.specs.find(spec => spec.label === "Warna")?.value, "Pink");
    assert.equal(linkedVariantSelection(customer, "SN-APRICOT-S"), undefined);
    assert.match(colorVariantIssue(customer, " APRICOT ")!, /dinonaktifkan/);
    for (const size of ["S", "M"]) assert.throws(() => selectProductVariants(customer, { [size]: 1 }, { Warna: "Apricot" }), /tidak tersedia/);
    const add = useCartStore.getState().add({ product: customer, color: "Apricot", sizes, selectedOptions: { Warna: "Apricot" } });
    assert.equal(add.ok, false);
    await assert.rejects(syncCheckoutCart(input), /dinonaktifkan/);
    await assert.rejects(getValidatedCheckoutCart(previousCart.id, input.companyId, input.userId), /dinonaktifkan/, "old carts must revalidate at payment");
    const pinkCart = await syncCheckoutCart({ ...input, items: [{ ...input.items[0]!, selectedColor: "Pink", selectedOptions: { Warna: "Pink" } }] });
    assert.equal(pinkCart.items[0]?.sizeVariants?.[0]?.sku, "SN-PINK-S");
    const feedProduct = { ...customer, mainImage: "https://ofissio.com/pink.png", productVariants: customer.productVariants?.map(row => ({ ...row, imageSrc: "https://ofissio.com/pink.png" })) };
    assert.equal(merchantProduct(feedProduct, rows).items.some(row => row.color === "Apricot"), false);
    assert.deepEqual(saleableColorVariationRows(product, rows).map(row => row.sku), ["SN-PINK-S", "SN-PINK-M"]);
    await save(undefined);
    assert.deepEqual(readInactiveProductColors(product), ["Apricot"], "older editors must not silently reactivate hidden colors");
    rows.forEach(row => { row.stock_quantity = 999; });
    assert.deepEqual((await mapped()).colors, ["Pink"], "inventory updates cannot reactivate Apricot");
    await save([]);
    customer = await mapped();
    assert.deepEqual(customer.colors, ["Apricot", "Pink"]);
    assert.equal(customer.defaultVariantSku, "SN-APRICOT-S");
    assert.deepEqual(customer.productVariants?.map(row => row.id), retainedInventory.map(row => row.id));
    assert.equal(rows[0]?.stock_quantity, 999);
    assert.deepEqual(historicalOrder, { sku: retainedInventory[0]!.sku, variationId: retainedInventory[0]!.id, color: "Apricot", image: retainedInventory[0]!.image });
    await save(["Apricot", "Pink"]);
    customer = await mapped();
    assert.deepEqual(customer.available_colors, [], "never invent a Default color when all colors are inactive");
    assert.equal(validateProductForCatalog(customer).ok, false);
    assert.equal(validateProductForCart(customer).ok, false);
    assert.equal(getProductReadiness(product).isVisibleInOfissio, false, "admin readiness also explains an all-inactive product");
    assert(getProductReadiness(product).blockingIssues.some(issue => issue.field === "inactive_colors"));
    await save([]);
    dropSalesSetting = true;
    await assert.rejects(save(["Apricot"]), /Status penjualan warna belum tersimpan/);
    dropSalesSetting = false;

    // Managed legacy color/size and imported purchase rows use the same sales policy.
    const legacy = colorSellingFixture();
    legacy.product.meta_data = legacy.product.meta_data!.filter(meta => !["ofissio_product_kind", "ofissio_variant_options", "ofissio_product_variants"].includes(meta.key));
    legacy.product.meta_data.push({ key: "ofissio_color_variants_enabled", value: "1" }, { key: "ofissio_color_variants_ready", value: "1" }, { key: "ofissio_color_size_variants_enabled", value: "1" }, { key: INACTIVE_PRODUCT_COLORS_META, value: '["Apricot"]' });
    legacy.rows.forEach(row => { row.meta_data = [...(row.meta_data ?? []), { key: COLOR_VARIANT_MARKER, value: true }, { key: "ofissio_color_size_variant", value: true }, { key: "ofissio_color", value: row.attributes![0]!.option }, { key: "ofissio_size", value: row.attributes![1]!.option }, { key: "ofissio_color_sku", value: row.sku.replace(/-[SM]$/, "") }]; });
    const source = { ...woocommerceClient, getProductById: async () => legacy.product, getProductVariations: async () => legacy.rows };
    const legacyLive = await withLiveColorVariants(legacy.product, source);
    assert.equal(readColorVariants(legacyLive).length, 2, "raw admin color mapping retains inactive color");
    assert.equal(mapNativeColorSizeVariants(legacy.rows).length, 4);
    const legacyCustomer = mapWooCommerceProductToOfissioProduct(legacyLive);
    assert.deepEqual(legacyCustomer.colors, ["Pink"]);
    assert.equal(legacyCustomer.colorVariants?.length, 1);
    assert.equal(legacyCustomer.colorSizeVariants?.length, 2);
    assert.throws(() => selectColorSizeVariants(legacyCustomer, "Apricot", sizes), /belum tersedia/);
    legacy.product.meta_data = legacy.product.meta_data.filter(meta => !["ofissio_color_variants_enabled", "ofissio_color_size_variants_enabled"].includes(meta.key));
    const imported = mapWooCommerceProductToOfissioProduct(await withLiveColorVariants(legacy.product, source));
    assert.equal(imported.purchaseVariants?.length, 2);
    assert(imported.purchaseVariants?.every(row => row.color === "Pink"));
    console.log("PASS: reversible per-color sales, all sizes, admin retention, exact native IDs/SKUs/images/stock, legacy/imported variants, old clients, stock updates, customer defaults/catalog/feed, cart and payment revalidation, provider verification.");
  } finally {
    Object.assign(woocommerceClient, original);
    productServerService.getProductById = originalRead;
    mockProductRepository.getProductById = originalMockRead;
    globalThis.fetch = originalFetch;
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
