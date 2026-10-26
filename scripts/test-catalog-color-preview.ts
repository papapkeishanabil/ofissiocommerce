import assert from "node:assert/strict";
import type { OfissioProduct } from "../src/features/products/product.types";
import { catalogColorPreview } from "../src/components/catalog/catalog-colors";

// Minimal fixture for the gallery selection contract, never catalog content.
const product = {
  name: "Test shirt", mainImage: "/yellow.png", available_colors: ["Lilac", "Ungu Manggis", "Kuning"],
  images: [{ id: 1, src: "/yellow.png", name: "Front", alt: "Yellow front" }, { id: 2, src: "/yellow-back.png", name: "Back", alt: "Yellow back" }],
  colorVariants: [
    { color: "Lilac", imageSrc: "" },
    { color: "Ungu Manggis", imageSrc: "/purple.png" },
  ],
} as OfissioProduct;
assert.equal(catalogColorPreview(product).product, product);
const family = catalogColorPreview(product, "nuansa-ungu");
assert.equal(family.product.images?.[0]?.src, "/purple.png");
assert.equal(family.color, "Ungu Manggis");
assert.equal(family.usesMainPhoto, false);
assert.equal(family.product.images?.length, 1, "No unrelated yellow hover image");
const missing = catalogColorPreview(product, "lilac");
assert.equal(missing.usesMainPhoto, true);
assert.equal(missing.product.images?.[0]?.src, "/yellow.png");
assert.equal(missing.color, "Lilac");
assert.equal(catalogColorPreview(product, "nuansa-merah").product, product);
assert.equal(product.images?.length, 2, "Original gallery stays unchanged");
console.log("PASS: exact color, color family, missing photo fallback, hover isolation, unchanged original gallery");
