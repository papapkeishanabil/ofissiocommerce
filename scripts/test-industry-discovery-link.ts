import assert from "node:assert/strict";
import { industryDiscoveryHref } from "../src/features/seo/industry-discovery-link";
import { INSPIRATION_PAGES } from "../src/features/site-content/industry-inspiration.routes";
import { DEFAULT_INDUSTRIES } from "../src/features/catalog-taxonomy/catalog-taxonomy.defaults";

const routes = new Set(INSPIRATION_PAGES.map(page => `/inspirasi/${page.slug}`));
for (const industry of DEFAULT_INDUSTRIES) {
  const href = industryDiscoveryHref(industry.slug);
  assert(href.startsWith('/catalog?industri=') || routes.has(href), industry.slug);
}
assert.equal(industryDiscoveryHref('mining'), '/inspirasi/pertambangan');
assert.equal(industryDiscoveryHref('construction'), '/inspirasi/konstruksi');
assert.equal(industryDiscoveryHref('healthcare'), '/inspirasi/apotek-klinik');
assert.equal(industryDiscoveryHref('logistics'), '/inspirasi/ekspedisi');
assert.equal(industryDiscoveryHref('government'), '/catalog?industri=government');
assert.equal(industryDiscoveryHref('bidang-baru'), '/catalog?industri=bidang-baru');
assert.equal(industryDiscoveryHref('custom & team'), '/catalog?industri=custom%20%26%20team');
console.log('PASS: existing industry pages, no invented routes, broader government and custom industry fallback.');
