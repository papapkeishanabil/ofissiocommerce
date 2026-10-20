import assert from "node:assert/strict";
import { mapOfissioProductToCartItem, mapWooCommerceProductToOfissioProduct } from "../src/features/products/product.mapper";
import { getProductReadiness } from "../src/features/products/woocommerce/woocommerce-product-readiness";
import { validateProduct3DModel, validateProductForCart } from "../src/features/products/product.validation";
import { validateWooCommerceProductForOfissio } from "../src/features/products/woocommerce/woocommerce-product.validation";
import type { WooCommerceProduct } from "../src/features/products/woocommerce/woocommerce.types";
import { productServerService } from "../src/features/products/product.server-service";
import { syncCheckoutCart } from "../src/features/checkout/checkout-cart.service";
import { emptySizeMatrix } from "../src/types/cart";

process.env.DATABASE_PROVIDER = "mock";

async function run() {
  const raw: WooCommerceProduct = {
    id: 991, name: "Plain uniform", slug: "plain-uniform", sku: "PLAIN-991", status: "publish",
    type: "simple", price: "150000", regular_price: "150000", sale_price: "", description: "Uniform", short_description: "Uniform",
    categories: [{ id: 1, name: "Uniform", slug: "uniform" }],
    images: [{ id: 1, src: "/uniform.jpg", alt: "Uniform" }],
    meta_data: [
      { key: "industries", value: ["office"] }, { key: "moq", value: 1 },
      { key: "lead_time", value: "3 hari" }, { key: "fulfillment_type", value: "ready_stock" },
      { key: "transaction_mode", value: "direct_checkout" },
      { key: "supports_embroidery", value: true },
    ],
  };
  assert.equal(getProductReadiness(raw).isVisibleInOfissio, true);
  // Stale metadata without an uploaded file must not create a usable model.
  raw.meta_data!.push({ key: "model_3d_id", value: "reserved-id" }, { key: "has_3d_model", value: true });
  const plain = mapWooCommerceProductToOfissioProduct(raw);
  assert.equal(plain.model_3d, null);
  assert.equal(getProductReadiness(plain).isVisibleInOfissio, true);
  assert.equal(validateWooCommerceProductForOfissio(plain).ok, true);
  assert.equal(validateProductForCart(plain).ok, true);
  assert.equal(validateProduct3DModel(plain).ok, false);
  assert.equal(mapOfissioProductToCartItem(plain).canAddEmbroidery, false);
  assert.equal(getProductReadiness({ ...raw, images: [] }).isVisibleInOfissio, false);
  assert.equal(getProductReadiness({ ...raw, status: "draft" }).isVisibleInOfissio, false);
  const draft = mapWooCommerceProductToOfissioProduct({ ...raw, status: "draft" });
  assert.equal(getProductReadiness(draft).isVisibleInOfissio, false);
  assert.equal(validateWooCommerceProductForOfissio(draft).ok, false);
  assert.equal(validateProductForCart(draft).ok, false);
  const withModel = structuredClone(raw);
  withModel.meta_data!.push(
    { key: "model_3d_url", value: "/3d/uniform.glb" }, { key: "model_3d_version", value: "v1" },
    { key: "model_3d_source", value: "manual" }, { key: "model_3d_filename", value: "uniform.glb" },
    { key: "embroidery_zones", value: ["left_chest"] },
  );
  const modeled = mapWooCommerceProductToOfissioProduct(withModel);
  assert.equal(validateProduct3DModel(modeled).ok, true);
  assert.equal(validateProductForCart(modeled).ok, true);
  assert.equal(mapOfissioProductToCartItem(modeled).canAddEmbroidery, true);
  withModel.meta_data!.find((row) => row.key === "model_3d_url")!.value = "/invalid.txt";
  assert.equal(getProductReadiness(withModel).isVisibleInOfissio, false);
  assert.equal(validateProduct3DModel(mapWooCommerceProductToOfissioProduct(withModel)).ok, false);

  const originalRead = productServerService.getProductById;
  productServerService.getProductById = async () => plain;
  try {
    const input = { companyId: "test-plain", userId: "test-user", items: [{ productId: plain.id, selectedColor: plain.colors[0] || "Default", sizeMatrix: { ...emptySizeMatrix(), M: 20 }, customization: null as string | null, embroideryPlacements: [] }] };
    const cart = await syncCheckoutCart(input);
    assert.equal(cart.items[0]?.productSubtotal, 3000000);
    assert.equal(cart.items[0]?.model3dUrl, "");
    input.items[0]!.customization = "bordir logo";
    await assert.rejects(syncCheckoutCart(input), /Fitur bordir belum tersedia/);
    productServerService.getProductById = async () => draft;
    input.items[0]!.customization = null;
    await assert.rejects(syncCheckoutCart(input), /publish/);
  } finally {
    productServerService.getProductById = originalRead;
  }
  console.log("PASS: plain catalog, cart and checkout; required data; valid 3D; invalid model; server embroidery rejection.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
