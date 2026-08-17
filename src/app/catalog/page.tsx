import type { Metadata } from "next";

import { ProductCatalog } from "@/components/catalog/ProductCatalog";
import {
  normalizeIndustrySlug,
  slugifyTaxonomy,
  withCatalogSearchVocabulary,
} from "@/features/catalog-taxonomy/catalog-taxonomy.defaults";
import { normalizeCatalogSearch } from "@/features/catalog-taxonomy/catalog-search";
import { getPublicCatalogTaxonomy } from "@/features/catalog-taxonomy/catalog-taxonomy.service";
import { productServerService } from "@/features/products/product.server-service";

export const metadata: Metadata = {
  title: "Katalog Produk",
  description: "Telusuri seragam kerja untuk setiap industri di Ofissio.",
};

interface PageProps {
  searchParams: Promise<{
    industri?: string;
    kategori?: string;
    warna?: string;
    /** Alias lama dari konten homepage ("?category=") — diperlakukan sama. */
    category?: string;
  }>;
}

export default async function Page({ searchParams }: PageProps) {
  const search = await searchParams;
  const [products, taxonomy] = await Promise.all([
    productServerService.getPublishedProducts(),
    getPublicCatalogTaxonomy(),
  ]);
  const searchTaxonomy = withCatalogSearchVocabulary(taxonomy);
  const rawKategori = search.kategori ?? search.category;
  const normalizedIndustry = search.industri
    ? normalizeCatalogSearch(search.industri, searchTaxonomy).industrySlugs[0] ??
      normalizeIndustrySlug(search.industri)
    : undefined;
  const normalizedCategory = rawKategori
    ? normalizeCatalogSearch(rawKategori, searchTaxonomy).categorySlugs[0] ??
      slugifyTaxonomy(rawKategori)
    : undefined;
  const industry = taxonomy.industries.find(
    (item) =>
      item.slug === normalizedIndustry || item.name === search.industri,
  );
  const activeCategory = taxonomy.categories.find(
    (item) =>
      item.slug === normalizedCategory || item.name === rawKategori,
  );
  const category =
    activeCategory ??
    searchTaxonomy.categories.find((item) => item.slug === normalizedCategory);

  return (
    <ProductCatalog
      products={products}
      industry={industry?.slug}
      category={category?.slug}
      industryLabel={industry?.name}
      categoryLabel={category?.name}
      color={search.warna}
      categoryStrict={Boolean(activeCategory)}
      taxonomyCategories={taxonomy.categories}
      taxonomyIndustries={taxonomy.industries}
      alternativeCategories={taxonomy.categories.filter(
        (item) => item.slug !== category?.slug,
      )}
      alternativeIndustries={taxonomy.industries.filter(
        (item) => item.slug !== industry?.slug,
      )}
    />
  );
}
