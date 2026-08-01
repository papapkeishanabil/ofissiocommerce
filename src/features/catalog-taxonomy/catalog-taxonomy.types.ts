export interface CatalogCategoryMetadata {
  id: string;
  wooCategoryId: number;
  categorySlug: string;
  active: boolean;
  synonyms: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CatalogCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  productCount: number;
  active: boolean;
  synonyms: string[];
  source: "woocommerce";
}

export interface IndustryMaster {
  id: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
  synonyms: string[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogAttributeTerm {
  id: number;
  name: string;
  slug: string;
  productCount: number;
}

export interface CatalogAttribute {
  id: number;
  name: string;
  slug: string;
  type: string;
  orderBy: string;
  hasArchives: boolean;
  terms: CatalogAttributeTerm[];
  source: "woocommerce";
}

export interface ProductTaxonomyReference {
  id: number;
  name: string;
  slug: string;
}

export interface ProductAttributeValue {
  id: number | null;
  name: string;
  slug: string;
  options: string[];
  visible: boolean;
  variation: boolean;
}

export interface PublicCatalogTaxonomy {
  categories: Array<{
    name: string;
    slug: string;
    synonyms: string[];
  }>;
  industries: Array<{
    name: string;
    slug: string;
    description: string;
    synonyms: string[];
  }>;
  attributes: Array<{
    name: string;
    slug: string;
    terms: Array<{ name: string; slug: string }>;
  }>;
}

export interface CatalogSearchNormalization {
  originalQuery: string;
  normalizedQuery: string;
  categorySlugs: string[];
  industrySlugs: string[];
  attributeHints: Array<{
    attributeSlug: string;
    termSlug: string;
  }>;
  searchTerms: string[];
}

export interface CatalogSearchResult {
  normalization: CatalogSearchNormalization;
  resultCount: number;
  products: Array<{
    id: string;
    slug: string;
    name: string;
    sku: string;
    category: string;
    industries: string[];
    regularPrice: number;
    quantityPricing?: QuantityPricing;
    globalEmbroideryPricing: EmbroideryPricing;
    supportedEmbroideryZones: EmbroideryPricingZoneId[];
  }>;
  alternatives: {
    categories: Array<{ name: string; slug: string }>;
    industries: Array<{ name: string; slug: string }>;
  };
}

export interface CatalogTaxonomyRepository {
  listCategoryMetadata(): Promise<CatalogCategoryMetadata[]>;
  saveCategoryMetadata(
    input: Omit<CatalogCategoryMetadata, "id" | "createdAt" | "updatedAt">,
  ): Promise<CatalogCategoryMetadata>;
  listIndustries(): Promise<IndustryMaster[]>;
  createIndustry(
    input: Omit<IndustryMaster, "id" | "createdAt" | "updatedAt">,
  ): Promise<IndustryMaster>;
  updateIndustry(
    id: string,
    patch: Partial<
      Pick<
        IndustryMaster,
        "name" | "slug" | "description" | "active" | "synonyms" | "sortOrder"
      >
    >,
  ): Promise<IndustryMaster | null>;
}
import type { QuantityPricing } from "@/features/products/quantity-pricing";
import type { EmbroideryPricing } from "@/features/products/embroidery-pricing";
import type { EmbroideryPricingZoneId } from "@/features/products/embroidery-pricing";
