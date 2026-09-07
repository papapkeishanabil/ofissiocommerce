import assert from "node:assert/strict";

import { DEFAULT_HERO, heroSectionSchema } from "../src/features/site-content/content.schema";
import { isAllowedHeroModelKey } from "../src/features/site-content/site-content-model.service";

const validKey = "site-content/hero/123e4567-e89b-12d3-a456-426614174000-seragam-koki.glb";
assert.equal(isAllowedHeroModelKey(validKey), true);
assert.equal(isAllowedHeroModelKey("products/kk-006/v1/model.glb"), false);
assert.equal(isAllowedHeroModelKey("site-content/hero/../../secret.glb"), false);
assert.equal(isAllowedHeroModelKey("site-content/hero/not-a-uuid-model.glb"), false);

const uploaded = structuredClone(DEFAULT_HERO);
const firstPanel = uploaded.slides[2]?.panel;
assert.equal(firstPanel?.type, "product");
if (firstPanel?.type === "product") {
  firstPanel.glb = `/api/site-content/model-3d/${validKey}`;
}
const parsed = heroSectionSchema.parse(uploaded);
const parsedPanel = parsed.slides[2]?.panel;
assert.equal(parsedPanel?.type, "product");
if (parsedPanel?.type === "product") {
  assert.equal(parsedPanel.glb, `/api/site-content/model-3d/${validKey}`);
}

console.log("PASS: Hero GLB storage key allowlist and schema compatibility");
