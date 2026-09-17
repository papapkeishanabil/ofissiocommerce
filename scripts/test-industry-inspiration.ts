import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { INDUSTRIES } from "../src/types/industry";
import { DEFAULT_INDUSTRI, industriSectionSchema, industryInspirationSchema, industryInspirationPagesSchema } from "../src/features/site-content/content.schema";
import { INSPIRATION_PAGES, inspirationHref, findInspirationPage } from "../src/features/site-content/industry-inspiration.routes";
import { defaultInspirationPage, resolveInspirationPage } from "../src/features/site-content/industry-inspiration.content";
import { upsertInspirationDraft, mergeInspirationSuggestions } from "../src/features/site-content/industry-inspiration.draft";

assert.equal(INSPIRATION_PAGES.length, INDUSTRIES.length);
assert.equal(new Set(INSPIRATION_PAGES.map((page) => page.slug)).size, INDUSTRIES.length);
for (const industry of INDUSTRIES) {
  const url = inspirationHref(industry);
  const page = findInspirationPage(url.split("/").at(-1)!);
  assert.equal(page?.industry, industry);
  const data = defaultInspirationPage(industry);
  assert.ok(industryInspirationSchema.safeParse(data).success, `Valid content: ${industry}`);
  assert.ok(existsSync(join(process.cwd(), "public", data.image)), `Existing image: ${industry}`);
}
assert.equal(findInspirationPage("tidak-ada"), undefined);
assert.equal(inspirationHref("__proto__"), "/inspirasi");
assert.equal(inspirationHref("F&B"), "/inspirasi/restoran-kafe");
assert.equal(inspirationHref("Corporate"), "/inspirasi/solusi-korporasi");

const { inspirationPages: _pages, ...oldContent } = structuredClone(DEFAULT_INDUSTRI);
oldContent.inspiration.title = "Judul Bengkel yang telah disimpan admin";
oldContent.inspiration.annotations[0]!.anchorX = 44;
const migrated = industriSectionSchema.parse(oldContent);
assert.deepEqual(migrated.inspirationPages, []);
const bengkel = findInspirationPage("bengkel-teknisi")!;
assert.equal(resolveInspirationPage(bengkel, migrated).title, oldContent.inspiration.title);
assert.equal(resolveInspirationPage(bengkel, migrated).annotations[0]?.anchorX, 44);

const clinic = defaultInspirationPage("Kesehatan");
clinic.title = "Konten khusus Klinik";
clinic.image = "/custom-clinic.png";
clinic.annotations[0]!.labelX = 75;
const edited = { ...migrated, inspirationPages: [clinic] };
assert.equal(resolveInspirationPage(findInspirationPage(clinic.slug)!, edited).title, clinic.title);
assert.equal(resolveInspirationPage(findInspirationPage(clinic.slug)!, edited).image, clinic.image);
assert.equal(resolveInspirationPage(bengkel, edited).title, oldContent.inspiration.title);
assert.equal(resolveInspirationPage(findInspirationPage("retail")!, edited).image, defaultInspirationPage("Retail").image);
const nextBengkel = { ...oldContent.inspiration, title: "Bengkel versi baru" };
assert.equal(resolveInspirationPage(bengkel, { ...edited, inspirationPages: [clinic, nextBengkel] }).title, nextBengkel.title);
assert.ok(industryInspirationPagesSchema.safeParse([clinic, nextBengkel]).success);
assert.ok(!industryInspirationPagesSchema.safeParse([clinic, clinic]).success);
assert.ok(!industryInspirationPagesSchema.safeParse([{ ...clinic, slug: "solusi-korporasi" }]).success);
assert.ok(!industryInspirationPagesSchema.safeParse([{ ...clinic, annotations: [{ ...clinic.annotations[0], anchorX: 101 }] }]).success);
console.log(`PASS: ${INDUSTRIES.length} industry routes, valid assets/content, legacy preservation, per-page isolation and validation.`);

// A delayed result for A must not replace B's intervening changes.
const snapshot = defaultInspirationPage("Kesehatan");
const retail = { ...defaultInspirationPage("Retail"), title: "Draf Retail terbaru" };
let draftPages = upsertInspirationDraft([snapshot], retail);
const currentClinic = structuredClone(snapshot);
currentClinic.title = "Judul Klinik diketik saat AI berjalan";
currentClinic.annotations[0]!.anchorX = 41;
currentClinic.annotations[1]!.description = "Penjelasan baru";
currentClinic.focalX = 60;
const suggestion = { focalX: 30, placements: snapshot.annotations.map((pin) => ({ id: pin.id, anchorX: 54, anchorY: 45, labelX: 70, labelY: 40 })) };
const completion = mergeInspirationSuggestions(currentClinic, snapshot, suggestion)!;
draftPages = upsertInspirationDraft(draftPages, completion);
assert.equal(draftPages.find((page) => page.industry === "Retail")?.title, retail.title);
assert.equal(completion.title, currentClinic.title);
assert.equal(completion.annotations[0]?.anchorX, 41); // manual move wins
assert.equal(completion.annotations[1]?.anchorX, 54); // untouched pin gets suggestion
assert.equal(completion.annotations[1]?.description, "Penjelasan baru");
assert.equal(completion.focalX, 60);
assert.equal(mergeInspirationSuggestions({ ...currentClinic, image: "/new-image.png" }, snapshot, suggestion), null);
assert.equal(mergeInspirationSuggestions(retail, snapshot, suggestion), null);
const removedPin = { ...currentClinic, annotations: currentClinic.annotations.slice(1) };
assert.equal(mergeInspirationSuggestions(removedPin, snapshot, suggestion)?.annotations.length, 2);
const renamedPin = structuredClone(snapshot);
renamedPin.annotations[0]!.title = "Manfaat baru";
assert.equal(mergeInspirationSuggestions(renamedPin, snapshot, suggestion)?.annotations[0]?.anchorX, snapshot.annotations[0]?.anchorX);
console.log("PASS: delayed cross-page completion, same-page edits, manual pins, changed images, removed/renamed benefits.");
