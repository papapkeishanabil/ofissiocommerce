import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

const brandImages = [{
  url: `${SITE_URL}/brand/ofissio-share-navy-v4.png`,
  width: 512, height: 512, alt: "Ofissio — Seragam kerja ready stock dan bordir logo",
}];

function storefrontMetadata(title: string, description: string, path: string): Metadata {
  const url = new URL(path, SITE_URL).href;
  return {
    title: { absolute: title }, description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: "Ofissio", locale: "id_ID", url, title, description, images: brandImages },
    twitter: { card: "summary", title, description, images: brandImages },
  };
}

export const homeMetadata = storefrontMetadata(
  "Seragam Kerja Ready Stock & Bordir Logo | Ofissio",
  "Temukan seragam kerja ready stock untuk perusahaan di Ofissio. Pilih kemeja kantor, seragam lapangan, dan rompi kerja dengan layanan bordir logo.",
  "/",
);

export const catalogMetadata = storefrontMetadata(
  "Katalog Seragam Kerja Ready Stock | Ofissio",
  "Pilih kemeja kerja, seragam kantor, dan seragam lapangan di katalog Ofissio. Temukan produk ready stock untuk kebutuhan tim dengan layanan bordir logo.",
  "/catalog",
);
