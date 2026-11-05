import { z } from "zod";
const text = z.string().max(12000);
export const safeUrl = z.string().max(2048).refine(value => {
    if (!value)
        return true;
    if (/^\/(?!\/)[^\\\s]*$/.test(value))
        return true;
    try {
        const url = new URL(value);
        return url.protocol === "https:" && !url.username && !url.password;
    }
    catch {
        return false;
    }
}, "Gunakan URL HTTPS atau path lokal yang valid.");
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const responsive = z.object({
    padding: z.number().int().min(0).max(160), gap: z.number().int().min(0).max(80),
    align: z.enum(["left", "center"]), reverse: z.boolean(),
});
const frame = z.object({
    ratio: z.number().min(.4).max(4), x: z.number().min(0).max(100), y: z.number().min(0).max(100),
    fit: z.enum(["cover", "contain"]),
});
export const imageSchema = z.object({
    id: z.string().min(1).max(100), src: safeUrl, mobileSrc: safeUrl,
    alt: z.string().max(500), caption: z.string().max(500),
    status: z.enum(["illustration", "real-photo"]), source: text,
    desktop: frame, mobile: frame,
    // Reference-only crops keep the approved prototype intact; replacing the image clears this crop.
    referenceCrop: z.object({ x: z.number(), y: z.number(), width: z.number().positive(), height: z.number().positive(), sourceWidth: z.number().positive(), sourceHeight: z.number().positive() }).optional(),
});
export const sectionTypes = ["hero", "story", "store", "collection", "operations", "closing"] as const;
export const sectionNames: Record<SectionType, string> = { hero: "Hero", story: "Cerita OFISSIO", store: "Toko OFISSIO", collection: "Koleksi", operations: "Proses dan operasional", closing: "Penutup" };
export const sectionSchema = z.object({
    id: z.string().regex(/^[a-z0-9-]{1,80}$/), type: z.enum(sectionTypes), visible: z.boolean(),
    label: z.string().max(200), title: z.string().max(300), accent: z.string().max(200),
    panelTitle: z.string().max(300), panelDescription: z.string().max(1000),
    paragraphs: z.array(text).max(12), items: z.array(z.string().max(200)).max(24),
    buttons: z.array(z.object({ label: z.string().max(100), href: safeUrl })).max(3),
    images: z.array(imageSchema).max(12),
    layout: z.enum(["editorial", "split", "mosaic", "grid"]),
    background: color, foreground: color, accentColor: color,
    desktop: responsive, mobile: responsive,
    requiresReview: z.boolean(), reviewNote: z.string().max(1000), verified: z.boolean(), verifiedAt: z.string().max(40),
});
export const pageDocumentSchema = z.object({
    schemaVersion: z.literal(1), title: z.string().min(1).max(200),
    description: z.string().max(500), sections: z.array(sectionSchema).min(1).max(30),
}).superRefine((document, ctx) => {
    const ids = document.sections.map(s => s.id);
    for (const section of document.sections) {
        if (new Set(section.images.map(i => i.id)).size !== section.images.length)
            ctx.addIssue({ code: "custom", message: "ID foto harus unik dalam section.", path: ["sections", section.id, "images"] });
    }
    if (new Set(ids).size !== ids.length)
        ctx.addIssue({ code: "custom", message: "ID section harus unik.", path: ["sections"] });
    if (document.sections.filter(s => s.visible && s.type === "hero").length > 1)
        ctx.addIssue({ code: "custom", message: "Hanya satu hero aktif diperbolehkan.", path: ["sections"] });
});
export type SectionType = typeof sectionTypes[number];
export type PageImage = z.infer<typeof imageSchema>;
export type PageSection = z.infer<typeof sectionSchema>;
export type PageDocument = z.infer<typeof pageDocumentSchema>;
export const commandSchema = z.discriminatedUnion("action", [
    z.object({ action: z.literal("save"), expectedRevision: z.number().int().nonnegative(), document: pageDocumentSchema }),
    z.object({ action: z.literal("publish"), expectedRevision: z.number().int().nonnegative() }),
    z.object({ action: z.literal("restore"), expectedRevision: z.number().int().nonnegative(), versionId: z.string().uuid() }),
]);
export type PageCommand = z.infer<typeof commandSchema>;
export type PageVersion = {
    id: string;
    revision: number;
    action: "save" | "publish" | "restore";
    actor: string;
    createdAt: string;
};
export type PageState = {
    slug: string;
    revision: number;
    draft: PageDocument;
    published: PageDocument | null;
    publishedAt: string | null;
    versions: PageVersion[];
    source: "mock" | "supabase";
};
function validReviewDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
        return false;
    const date = new Date(value + "T00:00:00Z");
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value <= new Date().toISOString().slice(0, 10);
}
export function requiresVerification(section:PageSection){return section.requiresReview || ["hero","story","store","operations"].includes(section.type);}
export function publishIssues(document: PageDocument): string[] {
    return document.sections.filter(s => s.visible).flatMap(s => [
        ...(requiresVerification(s) && (!s.verified || !validReviewDate(s.verifiedAt)) ? [`${s.label}: verifikasi dan tanggal acuan diperlukan.`] : []),
        ...s.images.filter(i => !i.src || !i.alt.trim()).map(() => `${s.label}: lengkapi gambar dan alt text.`),
        ...s.buttons.filter(b => !b.href || !b.label.trim()).map(() => `${s.label}: lengkapi tombol dan tautan.`),
    ]);
}
export function invalidateReview(previous: PageSection, next: PageSection): PageSection {
    const content = (s: PageSection) => JSON.stringify([s.title, s.accent, s.paragraphs, s.images, s.items, s.panelTitle, s.panelDescription]);
    return requiresVerification(next) && content(previous) !== content(next) ? { ...next, verified: false, verifiedAt: "" } : next;
}
