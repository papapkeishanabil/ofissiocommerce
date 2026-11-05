import "server-only";
import { randomUUID } from "node:crypto";
import { getDatabaseRuntimeConfig } from "@/features/database/database.config";
import { createApiError } from "@/lib/security/safe-error-response";
import { createAboutUsDraft } from "./page.defaults";
import { pageDocumentSchema, publishIssues, type PageCommand, type PageDocument, type PageState } from "./page.schema";
type Stored = PageState & {
    snapshots: Record<string, PageDocument>;
};
const globalStore = globalThis as typeof globalThis & {
    __ofissioPages?: Map<string, Stored>;
};
function fresh(slug: string): Stored { return { slug, revision: 0, draft: createAboutUsDraft(), published: null, publishedAt: null, versions: [], source: "mock", snapshots: {} }; }
function conflict() { return createApiError("BAD_REQUEST", "Draft berubah di sesi lain. Muat ulang sebelum menyimpan kembali.", 409); }
function validatePublication(document: PageDocument) { const issues = publishIssues(document); if (issues.length)
    throw createApiError("VALIDATION_ERROR", issues.join(" "), 422); }
function assertSlug(slug: string) { if (!/^[a-z0-9-]{1,80}$/.test(slug))
    throw createApiError("BAD_REQUEST", "Slug halaman tidak valid.", 400); }
// Mock storage is intentionally process-local, never used as a silent database fallback.
function store() { return globalStore.__ofissioPages ??= new Map(); }
async function rpc(slug: string, action: string, payload: Record<string, unknown> = {}) {
    const config = getDatabaseRuntimeConfig();
    const base = new URL(config.supabase.url);
    if (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname)))
        throw createApiError("PROVIDER_UNAVAILABLE", "Konfigurasi database tidak valid.", 503);
    let response: Response;
    try {
        response = await fetch(new URL("/rest/v1/rpc/cms_page_command", base), { method: "POST", cache: "no-store", signal: AbortSignal.timeout(15000), headers: { apikey: config.supabase.serviceRoleKey, Authorization: `Bearer ${config.supabase.serviceRoleKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_slug: slug, p_action: action, p_payload: payload, p_seed: createAboutUsDraft() }) });
    }
    catch {
        throw createApiError("PROVIDER_UNAVAILABLE", "Database Page Builder belum dapat dihubungi.", 503);
    }
    const body = await response.json().catch(() => null);
    if (!response.ok) {
        if (body?.message === "CMS_INVALID_PAYLOAD")
            throw createApiError("VALIDATION_ERROR", "Revisi dan identitas penyimpan wajib diisi.", 400);
        if (body?.message === "CMS_REVISION_CONFLICT")
            throw conflict();
        if (body?.message === "CMS_VERSION_NOT_FOUND")
            throw createApiError("NOT_FOUND", "Versi tidak ditemukan.", 404);
        if (body?.message === "CMS_REVIEW_REQUIRED")
            throw createApiError("VALIDATION_ERROR", "Verifikasi konten dan tanggal acuan diperlukan.", 422);
        throw createApiError("PROVIDER_UNAVAILABLE", "Page Builder belum siap. Periksa koneksi dan migration 040; perubahan belum disimpan.", 503);
    }
    return body;
}
function provider() { const config = getDatabaseRuntimeConfig(); if (config.requestedProvider !== "mock" && (config.provider !== "supabase" || !config.isConfigured))
    throw createApiError("PROVIDER_UNAVAILABLE", "Konfigurasi Supabase Page Builder belum lengkap.", 503); return config.provider; }
function external(state: Stored): PageState { const { snapshots: _, ...result } = state; return structuredClone(result); }
export async function readPage(slug: string): Promise<PageState> {
    assertSlug(slug);
    if (provider() === "supabase") {
        const value = await rpc(slug, "read");
        return { ...value, draft: pageDocumentSchema.parse(value.draft), published: value.published ? pageDocumentSchema.parse(value.published) : null, source: "supabase" };
    }
    return external(store().get(slug) ?? fresh(slug));
}
export async function readPublishedPage(slug: string): Promise<PageDocument | null> {
    assertSlug(slug);
    if (provider() === "supabase") {
        const value = await rpc(slug, "public");
        return value ? pageDocumentSchema.parse(value) : null;
    }
    return structuredClone(store().get(slug)?.published ?? null);
}
export async function commitPage(slug: string, command: PageCommand, actor: string): Promise<PageState> {
    assertSlug(slug);
    if (provider() === "supabase") {
        if (command.action === "publish") {
            const state = await readPage(slug);
            if (state.revision !== command.expectedRevision)
                throw conflict();
            validatePublication(state.draft);
        }
        const state = await rpc(slug, command.action, { ...command, actor });
        return { ...state, draft: pageDocumentSchema.parse(state.draft), published: state.published ? pageDocumentSchema.parse(state.published) : null, source: "supabase" };
    }
    // No await inside this critical section: compare, update and version append are atomic in one process.
    const current = store().get(slug) ?? fresh(slug);
    if (current.revision !== command.expectedRevision)
        throw conflict();
    const next: Stored = structuredClone(current);
    if (command.action === "save")
        next.draft = pageDocumentSchema.parse(command.document);
    if (command.action === "restore") {
        const snapshot = current.snapshots[command.versionId];
        if (!snapshot)
            throw createApiError("NOT_FOUND", "Versi tidak ditemukan.", 404);
        next.draft = structuredClone(snapshot);
        // A restored historical review is not a fresh confirmation.
        next.draft.sections = next.draft.sections.map(s => ({ ...s, verified: false, verifiedAt: "" }));
    }
    if (command.action === "publish") {
        validatePublication(next.draft);
        next.published = structuredClone(next.draft);
        next.publishedAt = new Date().toISOString();
    }
    next.revision++;
    const version = { id: randomUUID(), revision: next.revision, action: command.action, actor, createdAt: new Date().toISOString() };
    next.versions = [version, ...next.versions];
    next.snapshots[version.id] = structuredClone(next.draft);
    store().set(slug, next);
    return external(next);
}
