import assert from "node:assert/strict";

import {
  DEFAULT_PUBLIC_TAXONOMY,
  normalizeIndustrySlug,
} from "../src/features/catalog-taxonomy/catalog-taxonomy.defaults";
import { DEFAULT_INDUSTRI } from "../src/features/site-content/content.schema";
import { INDUSTRIES } from "../src/types/industry";

console.log("Ofissio homepage industry mapping check");
console.log("---------------------------------------");

const masterSlugs = new Set(
  DEFAULT_PUBLIC_TAXONOMY.industries.map((industry) => industry.slug),
);

for (const industry of INDUSTRIES) {
  const slug = normalizeIndustrySlug(industry);
  assert(
    masterSlugs.has(slug),
    `Industri kanonis ${industry} tidak memiliki master taxonomy (slug: ${slug}).`,
  );
}
console.log(`PASS: ${INDUSTRIES.length} industri kanonis terhubung ke master taxonomy.`);

const visibleTiles = DEFAULT_INDUSTRI.groups.flatMap((group) =>
  group.tiles.filter((tile) => !tile.hidden),
);
for (const tile of visibleTiles) {
  const slug = normalizeIndustrySlug(tile.industry);
  assert(
    masterSlugs.has(slug),
    `Kartu homepage ${tile.label} tidak memiliki master taxonomy (slug: ${slug}).`,
  );
}
console.log(`PASS: ${visibleTiles.length} kartu industri homepage memiliki filter katalog valid.`);

assert.equal(normalizeIndustrySlug("Perhotelan"), "hospitality");
assert.equal(normalizeIndustrySlug("Pertambangan"), "mining");
assert.equal(normalizeIndustrySlug("BUMN"), "government");
assert.equal(normalizeIndustrySlug("Ekspedisi"), "logistics");
console.log("PASS: alias industri Indonesia dipetakan ke slug katalog kanonis.");
