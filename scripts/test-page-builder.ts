import assert from "node:assert/strict";
import { createAboutUsDraft } from "../src/features/page-builder/page.defaults";
import { commitPage, readPage, readPublishedPage } from "../src/features/page-builder/page.repository";
import { invalidateReview, pageDocumentSchema, publishIssues, safeUrl } from "../src/features/page-builder/page.schema";
async function main() {
    process.env.DATABASE_PROVIDER = "mock";
    const slug = `test-${Date.now()}`;
    const initial = await readPage(slug);
    assert.equal(initial.revision, 0);
    assert.equal(await readPublishedPage(slug), null);
    assert.equal(initial.draft.sections.length, 6);
    const mandatory=structuredClone(initial.draft);mandatory.sections.forEach(s=>{s.requiresReview=false;});assert.ok(publishIssues(mandatory).some(issue=>issue.startsWith("Toko OFISSIO")));
    assert.equal(initial.draft.sections.find(s => s.type === "story")!.paragraphs.length, 4);
    for (const url of ["javascript:alert(1)", "//evil.example", "/\\evil.example", "data:text/html,x", "https://user:pass@evil.example"]) {
        assert.equal(safeUrl.safeParse(url).success, false, url);
    }
    for (const url of ["/catalog", "https://wa.me/6285959440993", ""])
        assert.equal(safeUrl.safeParse(url).success, true, url);
    const duplicate = createAboutUsDraft();
    duplicate.sections.push(duplicate.sections[0]!);
    assert.equal(pageDocumentSchema.safeParse(duplicate).success, false);
    const draft = createAboutUsDraft();
    draft.sections[0]!.title = "Draft khusus";
    let state = await commitPage(slug, { action: "save", expectedRevision: 0, document: draft }, "tester");
    assert.equal(state.revision, 1);
    assert.equal(state.versions.length, 1);
    assert.equal(await readPublishedPage(slug), null);
    await assert.rejects(() => commitPage(slug, { action: "save", expectedRevision: 0, document: draft }, "stale"), /sesi lain/);
    await assert.rejects(() => commitPage(slug, { action: "publish", expectedRevision: 1 }, "tester"), /verifikasi/i);
    draft.sections = draft.sections.map(s => ({ ...s, verified: true, verifiedAt: "2026-11-03" }));
    assert.deepEqual(publishIssues(draft), []);
    const badDate = structuredClone(draft);
    badDate.sections[0]!.verifiedAt = "2026-02-31";
    assert.ok(publishIssues(badDate).length > 0);
    badDate.sections[0]!.verifiedAt = "2099-01-01";
    assert.ok(publishIssues(badDate).length > 0);
    state = await commitPage(slug, { action: "save", expectedRevision: 1, document: draft }, "tester");
    state = await commitPage(slug, { action: "publish", expectedRevision: 2 }, "tester");
    assert.equal(state.revision, 3);
    assert.equal((await readPublishedPage(slug))!.sections[0]!.title, "Draft khusus");
    const publishedId = state.versions[0]!.id;
    const changed = structuredClone(draft);
    changed.sections[0]!.title = "Draft berbeda";
    state = await commitPage(slug, { action: "save", expectedRevision: 3, document: changed }, "tester");
    assert.equal((await readPublishedPage(slug))!.sections[0]!.title, "Draft khusus");
    state = await commitPage(slug, { action: "restore", expectedRevision: 4, versionId: publishedId }, "tester");
    assert.equal(state.draft.sections[0]!.title, "Draft khusus");
    assert.equal(state.draft.sections[0]!.verified, false);
    assert.equal(state.versions.length, 5);
    assert.equal((await readPublishedPage(slug))!.sections[0]!.title, "Draft khusus");
    const reviewed = draft.sections[0]!;
    assert.equal(invalidateReview(reviewed, { ...reviewed, title: "Berubah" }).verified, false);
    const parallel = await Promise.allSettled([commitPage(slug, { action: "save", expectedRevision: 5, document: draft }, "A"), commitPage(slug, { action: "save", expectedRevision: 5, document: draft }, "B")]);
    assert.equal(parallel.filter(r => r.status === "fulfilled").length, 1);
    assert.equal(parallel.filter(r => r.status === "rejected").length, 1);
    // Mock storage reads are defensive copies.
    const read = await readPage(slug);
    read.draft.sections[0]!.title = "mutated";
    assert.notEqual((await readPage(slug)).draft.sections[0]!.title, "mutated");
    process.env.DATABASE_PROVIDER = "supabase";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";
    await assert.rejects(() => readPage(slug), /belum lengkap/);
    console.log("PASS Page Builder: validation, draft/public separation, publish gate, optimistic concurrency, immutable versions, restore-to-draft and fail-closed storage.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
