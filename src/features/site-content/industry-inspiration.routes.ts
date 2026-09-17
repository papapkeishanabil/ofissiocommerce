import type { Industry } from "@/types/industry";

/** Canonical identities: shared by navigation, content validation and catalog filtering. */
export const INSPIRATION_ROUTES = {
  Bengkel: { slug: "bengkel-teknisi", label: "Bengkel dan Teknisi", group: "business" },
  Kesehatan: { slug: "apotek-klinik", label: "Apotek dan Klinik", group: "business" },
  Retail: { slug: "retail", label: "Toko dan Retail", group: "business" },
  "F&B": { slug: "restoran-kafe", label: "Restoran dan Kafe", group: "business" },
  Grosir: { slug: "grosir", label: "Grosir dan Distributor", group: "business" },
  Laundry: { slug: "laundry", label: "Laundry", group: "business" },
  Salon: { slug: "salon", label: "Salon dan Kecantikan", group: "business" },
  Bangunan: { slug: "toko-bangunan", label: "Toko Bangunan", group: "business" },
  Sparepart: { slug: "sparepart", label: "Toko Sparepart", group: "business" },
  Petshop: { slug: "petshop", label: "Petshop", group: "business" },
  Ekspedisi: { slug: "ekspedisi", label: "Ekspedisi dan Logistik", group: "business" },
  Security: { slug: "security", label: "Security", group: "business" },
  Corporate: { slug: "solusi-korporasi", label: "Solusi Korporasi", group: "corporate" },
  Pertambangan: { slug: "pertambangan", label: "Pertambangan", group: "corporate" },
  Konstruksi: { slug: "konstruksi", label: "Konstruksi", group: "corporate" },
  Manufaktur: { slug: "manufaktur", label: "Manufaktur", group: "corporate" },
  Perhotelan: { slug: "perhotelan", label: "Perhotelan", group: "corporate" },
  BUMN: { slug: "bumn", label: "BUMN dan Instansi", group: "corporate" },
  Maritim: { slug: "maritim", label: "Maritim", group: "corporate" },
  Pendidikan: { slug: "pendidikan", label: "Pendidikan", group: "corporate" },
} as const satisfies Record<Industry, { slug: string; label: string; group: "business" | "corporate" }>;

export const INSPIRATION_PAGES = (Object.keys(INSPIRATION_ROUTES) as Industry[]).map(
  (industry) => ({ industry, ...INSPIRATION_ROUTES[industry] }),
);
export type InspirationPage = (typeof INSPIRATION_PAGES)[number];

export function findInspirationPage(slug: string) {
  return INSPIRATION_PAGES.find((page) => page.slug === slug);
}

export function inspirationHref(industry: string) {
  const page = INSPIRATION_PAGES.find((entry) => entry.industry === industry);
  return page ? `/inspirasi/${page.slug}` : "/inspirasi";
}
