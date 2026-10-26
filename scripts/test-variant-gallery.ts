import assert from "node:assert/strict";
import { detachVariantImage, resolveVariantImage } from "../src/features/products/variant-image-references";
import { updateAdminProductImages } from "../src/features/products/woocommerce/woocommerce-product-image.service";
import { woocommerceClient } from "../src/features/products/woocommerce/woocommerce.client";
import type { WooCommerceProduct, WooCommerceProductVariation } from "../src/features/products/woocommerce/woocommerce.types";

async function run() {
  const old = { ...woocommerceClient };
  const images = [{ id: 1, src: "https://images.test/main.webp" }, { id: 2, src: "https://images.test/long.webp" }, { id: 3, src: "https://images.test/new.webp" }];
  let product = { id: 728, name: "KK-013", type: "variable", images, meta_data: [] } as unknown as WooCommerceProduct;
  const variants = [{ id: 10, status: "publish", sku: "KK-013LPJ-M", regular_price: "135000", stock_quantity: 9, attributes: [], image: images[1], meta_data: [{ key: "ofissio_product_variant", value: "1" }] }] as WooCommerceProductVariation[];
  const writes: string[] = [];
  woocommerceClient.getProductById = async () => structuredClone(product);
  woocommerceClient.getProductVariations = async () => structuredClone(variants);
  woocommerceClient.updateProductVariation = async (_p, id, payload) => {
    writes.push("variant");
    const row = variants.find(v => v.id === Number(id))!;
    Object.assign(row, payload, { image: images.find(image => image.id === payload.image?.id) });
    return structuredClone(row);
  };
  woocommerceClient.updateProduct = async (_id, payload) => {
    writes.push("gallery");
    product = { ...product, images: payload.images!.map(image => images.find(row => row.id === image.id)!), meta_data: payload.meta_data ?? product.meta_data };
    return structuredClone(product);
  };
  try {
    const source = [{ sku: "A", imageSrc: images[1]!.src }, { sku: "B", imageSrc: images[0]!.src }];
    const detached = detachVariantImage(source, images[1]!.src);
    assert.equal(detached[0]!.imageSrc, "");
    assert.equal(source[0]!.imageSrc, images[1]!.src);
    assert.equal(detached[1], source[1]);
    assert.equal(resolveVariantImage("blob:new", { "blob:new": "uploaded", uploaded: "persisted" }), "persisted");
    await updateAdminProductImages({ productId: 728, actorId: "test", payload: { images: [images[2]!, images[0]!] } });
    assert.deepEqual(writes, ["variant", "gallery"], "photo references are repaired before gallery removal");
    assert.equal(variants[0]!.image?.id, 3);
    assert.equal(variants[0]!.stock_quantity, 9);
    assert.equal(variants[0]!.regular_price, "135000");
    assert.equal(variants[0]!.sku, "KK-013LPJ-M");
    assert(variants[0]!.meta_data?.some(m => m.key === "ofissio_variant_inherit_image" && m.value === "1"));
    writes.length = 0;
    await assert.rejects(updateAdminProductImages({ productId: 728, actorId: "test", payload: { images: [] } }), /foto pengganti/);
    assert.deepEqual(writes, [], "deleting the last referenced photo performs no writes");
    console.log("PASS: removed-photo fallback, temporary URL resolution, independent gallery save, stock/price preservation and last-photo protection.");
  } finally { Object.assign(woocommerceClient, old); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
