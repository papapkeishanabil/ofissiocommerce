import type { Metadata } from "next";
import type { IndustryInspirationData } from "@/features/site-content/content.schema";
import { INSPIRATION_ROUTES } from "@/features/site-content/industry-inspiration.routes";
import { effectivePageSeo } from "./page-seo";
import { SITE_URL, publicImageUrl } from "@/lib/seo";

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
  const url = `${SITE_URL}/inspirasi/${data.slug}`;
  // F&B renders its own interactive photography instead of data.image.
  // The remaining pages use the same CMS image and alt text in their hero.
  const image = data.industry === "F&B" ? undefined : publicImageUrl(data.image);
  const images = image ? [{ url: image, alt: data.imageAlt }] : undefined;
  return { keywords: null, title: { absolute: effective.title }, description: effective.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website", url, siteName: "Ofissio", locale: "id_ID",
      title: effective.title, description: effective.description,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: effective.title, description: effective.description,
      ...(images ? { images } : {}),
    },
  };
}
