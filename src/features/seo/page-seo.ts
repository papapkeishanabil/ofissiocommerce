import { z } from "zod";

export const pageSeoSchema = z.object({
  primaryKeyword: z.string().trim().max(160).default(""),
  relatedKeywords: z.array(z.string().trim().max(160)).max(30).default([]).transform(items => [...new Set(items.filter(Boolean))]),
  title: z.string().trim().max(240).default(""),
  description: z.string().trim().max(1000).default(""),
}).strict();
export type PageSeo = z.infer<typeof pageSeoSchema>;
export const emptyPageSeo = (): PageSeo => ({ primaryKeyword: "", relatedKeywords: [], title: "", description: "" });

export function seoText(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function automaticPageSeo(name: string, description: string) {
  const clean = seoText(name);
  return { title: /\bofissio\b/i.test(clean) ? clean : `${clean} | Ofissio`, description: seoText(description).slice(0, 170) };
}

export function effectivePageSeo(seo: Partial<PageSeo> | undefined, automatic: { title: string; description: string }) {
  return { title: seo?.title?.trim() || automatic.title, description: seo?.description?.trim() || automatic.description };
}

export const PRODUCT_SEO_META = "ofissio_page_seo";
/** An explicit empty override resets to automatic, rather than reviving old plugin copy. */
export function readProductSeo(meta: Array<{ key: string; value: unknown }>): PageSeo {
  const own = meta.find(row => row.key === PRODUCT_SEO_META);
  if (own) {
    try { return pageSeoSchema.parse(typeof own.value === "string" ? JSON.parse(own.value) : own.value); } catch { /* Legacy malformed values are not public copy. */ }
  }
  const text = (...keys: string[]) => keys.map(key => meta.find(row => row.key === key)?.value).find(value => typeof value === "string" && value.trim()) as string | undefined;
  return { ...emptyPageSeo(), title: text("_yoast_wpseo_title", "rank_math_title") ?? "", description: text("_yoast_wpseo_metadesc", "rank_math_description") ?? "" };
}

/** Public projections deliberately exclude the team's target keywords. */
export function publicPageSeo(seo?: Partial<PageSeo>) {
  return { title: seo?.title ?? "", description: seo?.description ?? "" };
}
