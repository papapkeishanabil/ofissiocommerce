// src/app/page.tsx — Homepage

import { HomePage } from "@/components/home/HomePage";
import type { Metadata } from "next";

// Keep homepage sharing metadata here so product links can define their own
// preview instead of inheriting the homepage canonical URL and brand image.
export const metadata: Metadata = {
  openGraph: {
    type: "website",
    url: "https://ofissio.com/",
    siteName: "Ofissio",
    locale: "id_ID",
    title: "Ofissio : Seragam Professional Untuk Usaha Anda",
    description:
      "Platform conversational commerce B2B untuk pengadaan seragam kerja perusahaan. Dibantu Ofistant, asisten pengadaan digital.",
    images: [{
      url: "https://ofissio.com/brand/ofissio-share-navy-v3.png",
      width: 512,
      height: 512,
      type: "image/png",
      alt: "Logo Ofissio putih solid dengan latar navy",
    }],
  },
};

export default function Page() {
  return <HomePage />;
}
