import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";
import type { PageDocument } from "./page.schema";
import { ofissioOrganization } from "@/features/seo/organization-schema";

export const ABOUT_US_URL = `${SITE_URL}/tentang-kami`;
export const ABOUT_US_TITLE = "Tentang Ofissio | Seragam Kerja Ready Stock & Bordir Logo";
export const ABOUT_US_DESCRIPTION = "Kenali Ofissio, brand seragam kerja ready stock dengan layanan bordir logo untuk berbagai usaha. Jelajahi perjalanan, koleksi, dan proses produksi kami.";
const LEGACY_DESCRIPTION = "Mengenal OFISSIO, koleksi seragam kerja, toko, dan operasional.";

export function aboutUsMetadata(document: PageDocument): Metadata {
  // Upgrade the original CMS defaults without overriding custom admin copy.
  const customTitle = document.title.trim();
  const title = !customTitle || /^tentang ofissio$/i.test(customTitle)
    ? ABOUT_US_TITLE
    : /ofissio/i.test(customTitle) ? customTitle : `${customTitle} | Ofissio`;
  const description = !document.description.trim() || document.description.trim() === LEGACY_DESCRIPTION
    ? ABOUT_US_DESCRIPTION : document.description.trim();
  const images = [{
    url: `${SITE_URL}/brand/ofissio-share-navy-v4.png`,
    width: 512, height: 512, alt: "Ofissio — Seragam kerja ready stock dan bordir logo",
  }];
  return {
    title: { absolute: title }, description,
    alternates: { canonical: ABOUT_US_URL },
    openGraph: { type: "website", url: ABOUT_US_URL, siteName: "Ofissio", locale: "id_ID", title, description, images },
    twitter: { card: "summary", title, description, images },
  };
}

export function aboutUsStructuredData(document: PageDocument) {
  const metadata = aboutUsMetadata(document);
  return {
    "@context": "https://schema.org",
    "@graph": [
      ofissioOrganization(),
      {
        "@type": "AboutPage", "@id": `${ABOUT_US_URL}#webpage`, url: ABOUT_US_URL,
        name: (metadata.title as { absolute: string }).absolute,
        description: metadata.description, inLanguage: "id-ID",
        mainEntity: { "@id": `${SITE_URL}/#organization` },
        breadcrumb: { "@id": `${ABOUT_US_URL}#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList", "@id": `${ABOUT_US_URL}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Beranda", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Tentang Ofissio", item: ABOUT_US_URL },
        ],
      },
    ],
  };
}

export function publicPageImageAlt(alt: string): string {
  return alt.replace(/\s*-\s*visual persiapan prototype\s*$/i, "");
}
