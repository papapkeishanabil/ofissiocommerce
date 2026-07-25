// src/app/catalog/page.tsx

import type { Metadata } from "next";

import { ProductCatalog } from "@/components/catalog/ProductCatalog";
import { INDUSTRIES } from "@/types/industry";

export const metadata: Metadata = {
  title: "Katalog Produk",
  description: "Telusuri seragam kerja untuk setiap industri di Ofissio.",
};

interface PageProps {
  searchParams: Promise<{ industri?: string; kategori?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const sp = await searchParams;
  const industry = sp.industri;
  const category = sp.kategori;

  // Validate against known industries (defense in depth — avoid weird query).
  const safeIndustry =
    industry && INDUSTRIES.includes(industry as (typeof INDUSTRIES)[number])
      ? industry
      : undefined;

  return <ProductCatalog industry={safeIndustry} category={category} />;
}
