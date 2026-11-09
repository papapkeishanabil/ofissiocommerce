import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

const brandImages = [{
  url: `${SITE_URL}/brand/ofissio-share-navy-v4.png`,
  width: 512, height: 512, alt: "Ofissio — Seragam kerja ready stock dan bordir logo",
}];

function storefrontMetadata(title: string, description: string, path: string): Metadata {
  const url = new URL(path, SITE_URL).href;
  return {
    title: { absolute: title }, description, keywords: null,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: "Ofissio", locale: "id_ID", url, title, description, images: brandImages },
    twitter: { card: "summary", title, description, images: brandImages },
  };
}

export const homeMetadata = storefrontMetadata(
  "Toko Kemeja Kerja & Seragam Kerja | OFISSIO",
  "Cari kemeja kerja dan seragam kerja? Jelajahi model kantor, lapangan, dan safety di OFISSIO. Lihat foto, bahan, ukuran, harga, serta pilihan bordir logo.",
  "/",
);

export const catalogMetadata = storefrontMetadata(
  "Katalog Kemeja Kerja, Lapangan & Safety | OFISSIO",
  "Bandingkan kemeja kerja, kemeja lapangan, dan kemeja safety di katalog OFISSIO. Lihat foto produk, bahan, pilihan ukuran, harga, dan detail setiap model.",
  "/catalog",
);
