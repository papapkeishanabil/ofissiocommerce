import type { Metadata } from "next";

import { ProductCatalog } from "@/components/catalog/ProductCatalog";
import {
  normalizeIndustrySlug,
  slugifyTaxonomy,
  withCatalogSearchVocabulary,
} from "@/features/catalog-taxonomy/catalog-taxonomy.defaults";
import { normalizeCatalogSearch } from "@/features/catalog-taxonomy/catalog-search";
import { matchStorefrontCatalogProducts } from "@/features/catalog-taxonomy/catalog-broad-search";
import { getPublicCatalogTaxonomy } from "@/features/catalog-taxonomy/catalog-taxonomy.service";
import { productServerService } from "@/features/products/product.server-service";
import { catalogMetadata } from "@/features/seo/storefront-metadata";
import { listCatalogCategories } from "@/features/catalog-taxonomy/catalog-taxonomy.service";
import { automaticPageSeo, effectivePageSeo } from "@/features/seo/page-seo";
import { catalogCollectionSchema } from "@/features/seo/catalog-discovery";
import { serializeJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const search = await searchParams;
  const slug = search.kategori ?? search.category;
  if (!slug) return { ...catalogMetadata, keywords: null };
  const categories = await listCatalogCategories().catch(() => []);
  const category = categories.find(item => item.active && (item.slug === slug || item.name === slug));
  if (!category) return { ...catalogMetadata, keywords: null };
  const effective = effectivePageSeo(category.seo, automaticPageSeo(category.name, category.description));
  // Category URLs are existing catalog filters: preserve their /catalog canonical.
  return { ...catalogMetadata, keywords: null, title: { absolute: effective.title }, description: effective.description,
    openGraph: { ...catalogMetadata.openGraph, ...effective }, twitter: { ...catalogMetadata.twitter, ...effective } };
}

interface PageProps {
  searchParams: Promise<{
    industri?: string;
    kategori?: string;
    warna?: string;
    q?: string;
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
  const query = search.q?.trim().slice(0, 800);
  const matchingProducts = query
    ? matchStorefrontCatalogProducts(products, query, normalizeCatalogSearch(query, searchTaxonomy), taxonomy)
    : products;
  const rawKategori = search.kategori ?? search.category;
  const normalizedIndustry = search.industri
    ? normalizeCatalogSearch(search.industri, searchTaxonomy).industrySlugs[0] ??
      normalizeIndustrySlug(search.industri)
    : undefined;
  const normalizedCategory = rawKategori
    ? (slugifyTaxonomy(rawKategori) === "kemeja" ? "kemeja"
      : normalizeCatalogSearch(rawKategori, searchTaxonomy).categorySlugs[0] ?? slugifyTaxonomy(rawKategori))
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

  const collection = !query && !search.industri && !rawKategori && !search.warna
    ? catalogCollectionSchema(products) : null;
  return (<>
    {collection && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(collection) }} />}
    <ProductCatalog
      products={matchingProducts}
      searchQuery={query}
      industry={industry?.slug}
      category={category?.slug ?? normalizedCategory}
      industryLabel={industry?.name}
      categoryLabel={category?.name ?? rawKategori}
      color={search.warna}
      categoryStrict={Boolean(activeCategory) && normalizedCategory !== "kemeja"}
      taxonomyCategories={taxonomy.categories}
      taxonomyIndustries={taxonomy.industries}
      alternativeCategories={taxonomy.categories.filter(
        (item) => item.slug !== category?.slug,
      )}
      alternativeIndustries={taxonomy.industries.filter(
        (item) => item.slug !== industry?.slug,
      )}
    />
  </>);
}
