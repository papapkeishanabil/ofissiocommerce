import assert from "node:assert/strict";
import { createAboutUsDraft } from "../src/features/page-builder/page.defaults";
import { aboutUsMetadata, aboutUsStructuredData, ABOUT_US_TITLE, ABOUT_US_URL, publicPageImageAlt } from "../src/features/page-builder/about-us.seo";
import { commitPage } from "../src/features/page-builder/page.repository";
import { serializeJsonLd } from "../src/lib/seo";
import sitemap from "../src/app/sitemap";

async function main() {
  process.env.DATABASE_PROVIDER = "mock";
  const document = createAboutUsDraft();
  document.title = "Tentang OFISSIO";
  document.description = "Mengenal OFISSIO, koleksi seragam kerja, toko, dan operasional.";
  const metadata = aboutUsMetadata(document);
  assert.deepEqual(metadata.title, { absolute: ABOUT_US_TITLE });
  assert.equal(metadata.alternates?.canonical, ABOUT_US_URL);
  assert.equal(metadata.openGraph?.description, metadata.description);
  document.title = "Cerita Ofissio";
  document.description = "Deskripsi khusus dari admin.";
  assert.deepEqual(aboutUsMetadata(document).title, { absolute: "Cerita Ofissio" });
  assert.equal(aboutUsMetadata(document).description, document.description);
  document.title = "Cerita Kami";
  assert.deepEqual(aboutUsMetadata(document).title, { absolute: "Cerita Kami | Ofissio" });
  document.description = "</script><script>alert(1)</script>";
  const json = serializeJsonLd(aboutUsStructuredData(document));
  assert.ok(!json.includes("</script>"));
  assert.equal(JSON.parse(json)["@graph"][1].mainEntity["@id"], "https://ofissio.com/#organization");
  assert.equal(publicPageImageAlt("Tim OFISSIO - visual persiapan prototype"), "Tim OFISSIO");
  assert.equal(publicPageImageAlt("Ilustrasi koleksi Ofissio"), "Ilustrasi koleksi Ofissio");

  assert.ok(!(await sitemap()).some(entry => entry.url === ABOUT_US_URL));
  const draft = createAboutUsDraft();
  draft.sections = draft.sections.map(section => ({ ...section, verified: true, verifiedAt: "2026-11-03" }));
  await commitPage("about-us", { action: "save", expectedRevision: 0, document: draft }, "seo-test");
  assert.ok(!(await sitemap()).some(entry => entry.url === ABOUT_US_URL), "Draft must stay out of sitemap");
  await commitPage("about-us", { action: "publish", expectedRevision: 1 }, "seo-test");
  assert.equal((await sitemap()).filter(entry => entry.url === ABOUT_US_URL).length, 1);
  console.log("PASS: About Us metadata, custom CMS copy, JSON-LD escaping, alt text, and draft/published sitemap");
}
void main();
