import { INSPIRATION_ROUTES } from "@/features/site-content/industry-inspiration.routes";
import type { Industry } from "@/types/industry";

// Explicit equivalences only. Government is broader than BUMN, so it keeps
// its catalog filter rather than linking to a narrower inspiration page.
const INDUSTRY_PAGES: Partial<Record<string, Industry>> = {
  corporate: "Corporate", mining: "Pertambangan", construction: "Konstruksi",
  manufacturing: "Manufaktur", hospitality: "Perhotelan", healthcare: "Kesehatan",
  education: "Pendidikan", logistics: "Ekspedisi", security: "Security",
  retail: "Retail", "food-beverage": "F&B", bengkel: "Bengkel", grosir: "Grosir",
  laundry: "Laundry", salon: "Salon", bangunan: "Bangunan", sparepart: "Sparepart",
  petshop: "Petshop", maritim: "Maritim", ekspedisi: "Ekspedisi", bumn: "BUMN",
};

export function industryDiscoveryHref(slug: string) {
  const industry = INDUSTRY_PAGES[slug];
  return industry
    ? `/inspirasi/${INSPIRATION_ROUTES[industry].slug}`
    : `/catalog?industri=${encodeURIComponent(slug)}`;
}
