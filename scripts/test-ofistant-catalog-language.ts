import assert from "node:assert/strict";
import { normalizeCatalogSearch } from "../src/features/catalog-taxonomy/catalog-search";
import { detectIntent } from "../src/lib/ofistant/ofistant.intent";

// These conversational requests must search exactly the same category as "jaket".
for (const query of [
  "jaket",
  "saya sedang mencari jaket",
  "saua sedang mencari jaket", // Customer wording from the reported failure.
  "sau aingin mencari jaket",
  "say ingin mencari jaket",
  "rekomendasi jaket terbaik",
  "jaket terlaris",
  "aku lagi nyari jaket",
  "tolong carikan jaket",
  "saya ingin melihat jaket",
  "tampilkan jaket",
  "tunjukkan jaket",
]) {
  const search = normalizeCatalogSearch(query);
  assert.deepEqual(search.categorySlugs, ["jaket"], query);
  assert.deepEqual(search.searchTerms, [], query);
  assert.equal(detectIntent(query).intent, "SEARCH_CATALOG", query);
}

// Removing conversational words must not discard meaningful product constraints.
for (const query of ["jaket camel", "saya sedang mencari jaket camel"]) {
  assert.deepEqual(normalizeCatalogSearch(query).searchTerms, ["camel"], query);
}
const specific = normalizeCatalogSearch("saya sedang mencari jaket TG-055 warna hitam");
for (const term of ["tg", "055"]) {
  assert.ok(specific.searchTerms.includes(term), term);
}
assert.deepEqual(specific.attributeHints, normalizeCatalogSearch("jaket TG-055 warna hitam").attributeHints);
assert.ok(specific.attributeHints.some(hint => hint.termSlug === "hitam"));
assert.deepEqual(normalizeCatalogSearch("saya sedang mencari jaket unicorn").searchTerms, ["unicorn"]);
assert.deepEqual(normalizeCatalogSearch("saya mencari TG-055").searchTerms, ["tg", "055"]);
const sleeves = normalizeCatalogSearch("kemeja lengan panjang");
const requestedSleeves = normalizeCatalogSearch("saya mencari kemeja lengan panjang");
assert.deepEqual(requestedSleeves.searchTerms, sleeves.searchTerms);
assert.deepEqual(requestedSleeves.attributeHints, sleeves.attributeHints);
assert.deepEqual(sleeves.searchTerms, []);
assert.deepEqual(sleeves.attributeHints, [{ attributeSlug: "lengan", termSlug: "panjang" }]);
assert.deepEqual(normalizeCatalogSearch("ada kemeja lengan pendek?").searchTerms, []);
assert.ok(normalizeCatalogSearch("kemeja lengan unicorn").searchTerms.includes("unicorn"));
assert.ok(normalizeCatalogSearch("kemeja lengan unicorn").searchTerms.includes("lengan"));
console.log("PASS Ofistant catalog language: conversational requests match category search; SKU, color, specifications and unknown terms retained.");
