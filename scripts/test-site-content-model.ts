import assert from "node:assert/strict";

import { DEFAULT_HERO, heroSectionSchema } from "../src/features/site-content/content.schema";
import { isAllowedSiteContentModelKey } from "../src/features/site-content/site-content-model.service";

const validHeroKey = "site-content/hero/123e4567-e89b-12d3-a456-426614174000-seragam-koki.glb";
assert.equal(isAllowedSiteContentModelKey(validHeroKey), true);
assert.equal(isAllowedSiteContentModelKey("products/kk-006/v1/model.glb"), false);
assert.equal(isAllowedSiteContentModelKey("site-content/hero/../../secret.glb"), false);
assert.equal(isAllowedSiteContentModelKey("site-content/hero/not-a-uuid-model.glb"), false);

// Target "produk" (§07) — folder terpisah, aturan nama file sama persis.
const validProdukKey = "site-content/produk/123e4567-e89b-12d3-a456-426614174000-wearpack.glb";
assert.equal(isAllowedSiteContentModelKey(validProdukKey), true);
assert.equal(isAllowedSiteContentModelKey("site-content/produk/../../secret.glb"), false);
assert.equal(isAllowedSiteContentModelKey("site-content/produk/not-a-uuid-model.glb"), false);
// Folder section yang belum dikenal tetap ditolak (allowlist, bukan prefix bebas).
assert.equal(isAllowedSiteContentModelKey("site-content/cta/123e4567-e89b-12d3-a456-426614174000-x.glb"), false);

const uploaded = structuredClone(DEFAULT_HERO);
const firstPanel = uploaded.slides[2]?.panel;
assert.equal(firstPanel?.type, "product");
if (firstPanel?.type === "product") {
  firstPanel.glb = `/api/site-content/model-3d/${validHeroKey}`;
}
const parsed = heroSectionSchema.parse(uploaded);
const parsedPanel = parsed.slides[2]?.panel;
assert.equal(parsedPanel?.type, "product");
if (parsedPanel?.type === "product") {
  assert.equal(parsedPanel.glb, `/api/site-content/model-3d/${validHeroKey}`);
}

console.log("PASS: Site-content GLB storage key allowlist (hero + produk) and schema compatibility");
