import assert from "node:assert/strict";
import { draggedImagePosition, homeImageFrame } from "../src/features/site-content/inspiration-framing";
import { DEFAULT_INDUSTRY_INSPIRATION, industryInspirationSchema } from "../src/features/site-content/content.schema";

const start = { x: 50, y: 50, fit: "cover" as const };
const right = draggedImagePosition(start, 100, 0, 300, 600, 1600, 1000);
assert.ok(right.x < 50, "dragging right moves a cropped photo right");
assert.equal(right.y, 50, "no vertical overflow means no vertical change");
assert.equal(draggedImagePosition(start, 10000, 0, 300, 600, 1600, 1000).x, 0);
assert.equal(draggedImagePosition(start, -10000, 0, 300, 600, 1600, 1000).x, 100);
assert.deepEqual(draggedImagePosition(start, 10, 10, 0, 0, 0, 0), start);
assert.ok(draggedImagePosition({ ...start, fit: "contain" }, 0, 40, 300, 600, 1600, 1000).y > 50);
const saved = industryInspirationSchema.parse(JSON.parse(JSON.stringify({
  ...DEFAULT_INDUSTRY_INSPIRATION,
  homepageFrames: { feature: { x: 35, y: 65, fit: "contain" }, card: { x: 41, y: 50, fit: "cover" } },
})));
assert.deepEqual(homeImageFrame(saved, "feature"), { x: 35, y: 65, fit: "contain" });
assert.equal(homeImageFrame(saved, "card").x, 41);
assert.equal(saved.focalX, DEFAULT_INDUSTRY_INSPIRATION.focalX, "homepage crops do not alter hero pins");
assert.deepEqual(saved.annotations, DEFAULT_INDUSTRY_INSPIRATION.annotations);
assert.deepEqual(homeImageFrame(undefined, "feature"), start);
assert.equal(industryInspirationSchema.safeParse({ ...saved, homepageFrames: { card: { ...start, x: 101 } } }).success, false);
console.log("PASS: drag geometry, clamping, contain, backwards compatibility, schema roundtrip and frame/pin isolation");
