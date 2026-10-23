import assert from "node:assert/strict";
import { DEFAULT_INDUSTRI, industriSectionSchema } from "../src/features/site-content/content.schema";

const feature = { image: "/separate-photo.jpg", imageAlt: "Foto utama bisnis", industry: "Grosir", x: 72, y: 30, fit: "cover" as const };
assert.ok(industriSectionSchema.safeParse(DEFAULT_INDUSTRI).success);
const saved = industriSectionSchema.parse({ ...DEFAULT_INDUSTRI, businessFeature: feature });
saved.groups[0]!.tiles.reverse();
assert.deepEqual(industriSectionSchema.parse(JSON.parse(JSON.stringify(saved))).businessFeature, feature);
assert.equal(industriSectionSchema.safeParse({ ...saved, businessFeature: { ...feature, x: 110 } }).success, false);
assert.equal(industriSectionSchema.safeParse({ ...saved, businessFeature: { ...feature, industry: "unknown" } }).success, false);
console.log("Independent business photo: persistence, reorder isolation and validation passed");
