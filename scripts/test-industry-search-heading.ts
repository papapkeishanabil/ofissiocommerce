import assert from "node:assert/strict";
import { industrySearchHeading } from "../src/features/site-content/industry-search-heading";
import { INSPIRATION_PAGES } from "../src/features/site-content/industry-inspiration.routes";

for (const page of INSPIRATION_PAGES) {
  const withShirt=industrySearchHeading(page.industry,[{name:"Kemeja Model Aktual"}]);
  assert(withShirt.includes("Kemeja"));
  assert(!/sertifikasi|tahan api|anti air|ready stock|harga grosir/i.test(withShirt));
  for(const products of [[],[{name:"Jaket Model Baru"}]]) {
    const heading=industrySearchHeading(page.industry,products);
    assert.equal(heading,`Pilihan Seragam ${page.label}`);
    assert(!heading.includes("Kemeja"));
  }
}
assert.equal(industrySearchHeading("Pertambangan",[{name:"Kemeja Safety KS-004"}]),"Kemeja Tambang dan Seragam Pertambangan");
assert.equal(industrySearchHeading("Konstruksi",[{name:"Kemeja Kerja KT-003"}]),"Kemeja Konstruksi dan Seragam Proyek");
assert.equal(industrySearchHeading("Perhotelan",[{name:"Kemeja KM"}]),"Kemeja Hotel dan Seragam Perhotelan");
assert.equal(industrySearchHeading("Grosir",[{name:"Kemeja KM"}]),"Kemeja dan Seragam Staf Grosir dan Distributor");
console.log("PASS: 20 industry headings, factual shirt presence, empty/jacket-only fallback, no invented protection or wholesale claims.");
