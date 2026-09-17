import type { Metadata } from "next";

import { IndustryInspirationPage } from "@/components/industry-inspiration/IndustryInspirationPage";
import { INSPIRATION_ROUTES } from "@/features/site-content/industry-inspiration.routes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inspirasi Seragam Bengkel dan Teknisi",
  description: "Pelajari manfaat seragam kerja yang nyaman untuk tim bengkel dan temukan pilihan produk Ofissio yang sesuai.",
};

export default async function BengkelTeknisiInspirationPage() {
  return <IndustryInspirationPage page={{ industry: "Bengkel", ...INSPIRATION_ROUTES.Bengkel }} />;
}
