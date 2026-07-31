import type {
  CatalogCategoryMetadata,
  IndustryMaster,
  PublicCatalogTaxonomy,
} from "./catalog-taxonomy.types";

const SEEDED_AT = "2026-07-31T00:00:00.000Z";

export const DEFAULT_CATEGORY_SYNONYMS: Record<string, string[]> = {
  kemeja: ["kemeja"],
  jaket: ["jaket", "jacket"],
  wearpack: ["wearpack", "coverall", "overall"],
  rompi: ["rompi", "vest"],
  "kaos-polo": ["kaos polo", "polo", "polo shirt"],
  celana: ["celana", "pants", "trousers"],
  topi: ["topi", "cap", "hat"],
  "safety-vest": ["safety vest", "rompi safety", "vest keselamatan"],
  "seragam-security": ["seragam security", "baju security", "seragam satpam"],
  "seragam-kantor": ["seragam kantor", "office uniform"],
  "seragam-lapangan": ["seragam lapangan", "baju lapangan", "field uniform"],
};

export const DEFAULT_INDUSTRIES: IndustryMaster[] = [
  industry("Corporate", "corporate", "Seragam kantor dan kebutuhan perusahaan.", [
    "kantor",
    "perusahaan",
    "office",
    "corporate",
  ], 10),
  industry("Mining", "mining", "Workwear untuk pertambangan dan site.", [
    "tambang",
    "pertambangan",
    "mining",
    "batubara",
    "batu bara",
  ], 20),
  industry("Manufacturing", "manufacturing", "Seragam manufaktur dan pabrik.", [
    "manufaktur",
    "manufacturing",
    "pabrik",
  ], 30),
  industry("Hospitality", "hospitality", "Seragam hotel dan layanan hospitality.", [
    "hotel",
    "restoran",
    "cafe",
    "hospitality",
  ], 40),
  industry("Healthcare", "healthcare", "Seragam kesehatan dan fasilitas medis.", [
    "kesehatan",
    "healthcare",
    "rumah sakit",
    "klinik",
    "medis",
  ], 50),
  industry("Education", "education", "Seragam institusi pendidikan.", [
    "pendidikan",
    "education",
    "sekolah",
    "kampus",
  ], 60),
  industry("Construction", "construction", "Workwear proyek dan konstruksi.", [
    "proyek",
    "konstruksi",
    "kontraktor",
    "lapangan",
    "construction",
  ], 70),
  industry("Logistics", "logistics", "Seragam logistik dan pergudangan.", [
    "logistik",
    "logistics",
    "gudang",
    "kurir",
  ], 80),
  industry("Security", "security", "Seragam keamanan dan petugas security.", [
    "security",
    "satpam",
    "keamanan",
  ], 90),
  industry("Government", "government", "Seragam instansi pemerintahan.", [
    "pemerintah",
    "pemerintahan",
    "government",
    "instansi",
  ], 100),
  industry("Retail", "retail", "Seragam toko dan operasional retail.", [
    "retail",
    "toko",
    "store",
  ], 110),
  industry("Food & Beverage", "food-beverage", "Seragam industri makanan dan minuman.", [
    "f&b",
    "fnb",
    "food beverage",
    "makanan",
    "minuman",
    "restoran",
    "cafe",
  ], 120),
];

export const DEFAULT_PUBLIC_TAXONOMY: PublicCatalogTaxonomy = {
  categories: Object.entries(DEFAULT_CATEGORY_SYNONYMS).map(
    ([slug, synonyms]) => ({
      name: titleFromSlug(slug),
      slug,
      synonyms,
    }),
  ),
  industries: DEFAULT_INDUSTRIES.map(
    ({ name, slug, description, synonyms }) => ({
      name,
      slug,
      description,
      synonyms,
    }),
  ),
  attributes: [
    attribute("Warna", "warna", ["navy", "hitam", "putih", "abu", "merah", "biru"]),
    attribute("Ukuran", "ukuran", ["s", "m", "l", "xl", "2xl", "3xl", "4xl"]),
    attribute("Bahan", "bahan", [
      "oxford",
      "american drill",
      "nagata drill",
      "kanvas",
      "tropical",
      "ripstop",
    ]),
    attribute("Gender", "gender", ["pria", "wanita", "unisex"]),
    attribute("Lengan", "lengan", ["pendek", "panjang"]),
    attribute("Fit", "fit", []),
    attribute("Kerah", "kerah", []),
    attribute("Closure", "closure", []),
    attribute("Safety Feature", "safety-feature", [
      "reflective tape",
      "fire retardant",
      "anti static",
      "water resistant",
    ]),
  ],
};

export function defaultCategoryMetadata(input: {
  wooCategoryId: number;
  categorySlug: string;
}): CatalogCategoryMetadata {
  const now = SEEDED_AT;
  return {
    id: `woo-category-${input.wooCategoryId}`,
    wooCategoryId: input.wooCategoryId,
    categorySlug: input.categorySlug,
    active: true,
    synonyms: DEFAULT_CATEGORY_SYNONYMS[input.categorySlug] ?? [],
    createdAt: now,
    updatedAt: now,
  };
}

function industry(
  name: string,
  slug: string,
  description: string,
  synonyms: string[],
  sortOrder: number,
): IndustryMaster {
  return {
    id: `industry-${slug}`,
    name,
    slug,
    description,
    active: true,
    synonyms,
    sortOrder,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  };
}

function attribute(name: string, slug: string, terms: string[]) {
  return {
    name,
    slug,
    terms: terms.map((term) => ({
      name: titleFromSlug(term),
      slug: slugifyTaxonomy(term),
    })),
  };
}

export function slugifyTaxonomy(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " dan ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeIndustrySlug(value: string) {
  const normalized = slugifyTaxonomy(value);
  const match = DEFAULT_INDUSTRIES.find((industry) =>
    [industry.slug, industry.name, ...industry.synonyms]
      .map(slugifyTaxonomy)
      .includes(normalized),
  );
  return match?.slug ?? normalized;
}

export function withCatalogSearchVocabulary(
  taxonomy: PublicCatalogTaxonomy,
): PublicCatalogTaxonomy {
  return {
    categories: mergeBySlug(
      taxonomy.categories,
      DEFAULT_PUBLIC_TAXONOMY.categories,
    ),
    industries: mergeBySlug(
      taxonomy.industries,
      DEFAULT_PUBLIC_TAXONOMY.industries,
    ),
    attributes: mergeBySlug(
      taxonomy.attributes,
      DEFAULT_PUBLIC_TAXONOMY.attributes,
    ),
  };
}

function mergeBySlug<T extends { slug: string }>(primary: T[], fallback: T[]) {
  const result = [...primary];
  const slugs = new Set(primary.map((item) => item.slug));
  for (const item of fallback) {
    if (!slugs.has(item.slug)) result.push(item);
  }
  return result;
}

function titleFromSlug(value: string) {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
