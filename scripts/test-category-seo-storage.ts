import assert from "node:assert/strict";
import { pageSeoSchema } from "../src/features/seo/page-seo";

async function main() {
  process.env.DATABASE_PROVIDER = "supabase";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:8099";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fixture";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture";
  const originalFetch = globalThis.fetch;
  let rows: Record<string, unknown>[] = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "http://localhost:8099", "fixture must never contact a real database");
    assert.equal(url.pathname, "/rest/v1/catalog_category_metadata");
    if (init?.method === "POST") rows.push(...JSON.parse(String(init.body)));
    if (init?.method === "PATCH") rows = rows.map(row => ({ ...row, ...JSON.parse(String(init.body)) }));
    return new Response(JSON.stringify(rows), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const { catalogTaxonomyRepository } = await import("../src/features/catalog-taxonomy/catalog-taxonomy.repository");
    const seo = pageSeoSchema.parse({ title: "Judul tersimpan", description: "Deskripsi tersimpan.", primaryKeyword: "target internal", relatedKeywords: ["pendukung"] });
    const input = { wooCategoryId: 12, categorySlug: "kategori-asli", active: true, synonyms: [], seo };
    assert.deepEqual((await catalogTaxonomyRepository.saveCategoryMetadata(input)).seo, seo);
    assert.deepEqual((await catalogTaxonomyRepository.listCategoryMetadata())[0]?.seo, seo);
    assert.deepEqual(rows[0]?.seo, seo, "JSONB write column survives the REST round trip");
    await catalogTaxonomyRepository.saveCategoryMetadata({ ...input, seo: pageSeoSchema.parse({}) });
    assert.equal((await catalogTaxonomyRepository.listCategoryMetadata())[0]?.seo?.title, "");
    console.log("PASS: Supabase REST category SEO insert/update/read/reset contract; all requests intercepted locally.");
  } finally { globalThis.fetch = originalFetch; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
