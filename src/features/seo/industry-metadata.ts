import type { Metadata } from "next";
import type { IndustryInspirationData } from "@/features/site-content/content.schema";
import { INSPIRATION_ROUTES } from "@/features/site-content/industry-inspiration.routes";
import { effectivePageSeo } from "./page-seo";

export function industryAutomaticSeo(data: IndustryInspirationData) {
  // Keep the pre-existing titles and the dedicated Bengkel route's fallback.
  return {
    title: `Inspirasi Seragam ${INSPIRATION_ROUTES[data.industry].label} | Ofissio`,
    description: data.industry === "Bengkel"
      ? "Pelajari manfaat seragam kerja yang nyaman untuk tim bengkel dan temukan pilihan produk Ofissio yang sesuai."
      : data.lede,
  };
}

export function industryPageMetadata(data: IndustryInspirationData): Metadata {
  const effective = effectivePageSeo(data.seo, industryAutomaticSeo(data));
  return { keywords: null, title: { absolute: effective.title }, description: effective.description,
    alternates: { canonical: `https://ofissio.com/inspirasi/${data.slug}` } };
}
