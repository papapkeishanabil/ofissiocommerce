import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IndustryScaleShowcase } from "../src/components/home/IndustryScaleShowcase";
import { DEFAULT_INDUSTRI, DEFAULT_INDUSTRI_DESCRIPTIONS, getSectionEntry, industriSectionSchema } from "../src/features/site-content/content.schema";
import { siteContentPayloadSchema } from "../src/features/site-content/site-content.validation";

const legacy = JSON.parse(JSON.stringify(DEFAULT_INDUSTRI)) as Record<string, unknown>;
delete legacy.businessDescription;
delete legacy.corporateDescription;
legacy.businessFeature = { image: "/saved-business.jpg", imageAlt: "Foto tersimpan", industry: "Grosir", x: 72, y: 30, fit: "contain" };
const restored = industriSectionSchema.parse(legacy);
assert.equal(restored.businessDescription, DEFAULT_INDUSTRI_DESCRIPTIONS.businessDescription);
assert.equal(restored.corporateDescription, DEFAULT_INDUSTRI_DESCRIPTIONS.corporateDescription);
assert.deepEqual(restored.businessFeature, legacy.businessFeature);
assert.deepEqual(restored.groups, industriSectionSchema.parse(DEFAULT_INDUSTRI).groups);
assert.deepEqual(restored.inspiration, DEFAULT_INDUSTRI.inspiration);

const custom = {
  ...restored,
  lede: "Mitra seragam untuk <bisnis> dan organisasi Anda.",
  businessDescription: "Seragam untuk <tim> bisnis kami.",
  corporateDescription: "Pengadaan terencana untuk tim multi-cabang kami.",
};
const payload = siteContentPayloadSchema.parse({ section: "industri", data: custom });
const saved = industriSectionSchema.parse(JSON.parse(JSON.stringify(payload.data)));
assert.equal(saved.lede, custom.lede);
assert.equal(saved.businessDescription, custom.businessDescription);
assert.equal(saved.corporateDescription, custom.corporateDescription);
assert.deepEqual(saved.businessFeature, restored.businessFeature);
assert.deepEqual(saved.groups, restored.groups);
assert.deepEqual(saved.inspirationPages, restored.inspirationPages);
assert.equal(industriSectionSchema.parse({ ...legacy, businessDescription: custom.businessDescription }).corporateDescription, DEFAULT_INDUSTRI_DESCRIPTIONS.corporateDescription);

for (const key of ["lede", "businessDescription", "corporateDescription"] as const) {
  for (const invalid of ["", "   ", "a".repeat(401), null]) {
    assert.equal(siteContentPayloadSchema.safeParse({ section: "industri", data: { ...saved, [key]: invalid } }).success, false);
  }
  const field = getSectionEntry("industri")!.fields.find((item) => item.key === key);
  assert.equal(field?.kind, "textarea");
  assert.equal(field && "maxLength" in field ? field.maxLength : undefined, 400);
}

const html = renderToStaticMarkup(createElement(IndustryScaleShowcase, { data: saved }));
assert.ok(html.includes("Mitra seragam untuk &lt;bisnis&gt; dan organisasi Anda."));
assert.ok(!html.includes("Dari kebutuhan lapangan hingga organisasi berskala besar."));
assert.ok(html.includes("Seragam untuk &lt;tim&gt; bisnis kami."));
assert.ok(html.includes(custom.corporateDescription));
assert.ok(!html.includes(DEFAULT_INDUSTRI_DESCRIPTIONS.businessDescription));
assert.ok(!html.includes(DEFAULT_INDUSTRI_DESCRIPTIONS.corporateDescription));
assert.ok(html.includes('id="usaha"'));
assert.ok(html.includes("bg-[#f5f7f9]"));
console.log("PASS: legacy CMS compatibility, saved copy, validation, field registration, safe public rendering, and photo/group preservation");

async function verifyMockPersistence() {
  process.env.DATABASE_PROVIDER = "mock";
  const { getSiteContent, updateSiteContent } = await import("../src/features/site-content/site-content.service");
  assert.equal((await getSiteContent()).source, "mock", "Fixture must never write to a real CMS");
  await updateSiteContent({ section: "industri", data: legacy }, null);
  const oldRow = (await getSiteContent()).sections.find((section) => section.key === "industri")!;
  assert.deepEqual(oldRow.data, restored);
  await updateSiteContent(payload, null);
  const reloaded = (await getSiteContent()).sections.find((section) => section.key === "industri")!;
  assert.deepEqual(reloaded.data, saved);
  const publicHtml = renderToStaticMarkup(createElement(IndustryScaleShowcase, { data: industriSectionSchema.parse(reloaded.data) }));
  assert.ok(publicHtml.includes("Mitra seragam untuk &lt;bisnis&gt; dan organisasi Anda."));
  assert.ok(publicHtml.includes(custom.corporateDescription));
  console.log("PASS: actual CMS service save/read with mock storage, legacy rows and public rendering after reload; real CMS writes: 0");
}

verifyMockPersistence().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
