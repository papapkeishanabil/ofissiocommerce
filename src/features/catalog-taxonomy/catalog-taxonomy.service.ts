import "server-only";

import { logAuditEvent } from "@/lib/security/audit-log";
import { createApiError } from "@/lib/security/safe-error-response";
import { woocommerceClient } from "@/features/products/woocommerce/woocommerce.client";

import {
  DEFAULT_PUBLIC_TAXONOMY,
  defaultCategoryMetadata,
} from "./catalog-taxonomy.defaults";
import { catalogTaxonomyRepository } from "./catalog-taxonomy.repository";
import type {
  CatalogAttribute,
  CatalogCategory,
  IndustryMaster,
  PublicCatalogTaxonomy,
} from "./catalog-taxonomy.types";
import type {
  CategoryCreatePayload,
  CategoryPatchPayload,
  IndustryCreatePayload,
  IndustryPatchPayload,
} from "./catalog-taxonomy.validation";

export async function listCatalogCategories(): Promise<CatalogCategory[]> {
  const [categories, metadata] = await Promise.all([
    woocommerceClient.getCategories(),
    catalogTaxonomyRepository.listCategoryMetadata(),
  ]);
  const metadataByWooId = new Map(
    metadata.map((item) => [item.wooCategoryId, item]),
  );
  return categories
    .map((category) => {
      const local =
        metadataByWooId.get(category.id) ??
        defaultCategoryMetadata({
          wooCategoryId: category.id,
          categorySlug: category.slug,
        });
      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description ?? "",
        productCount: category.count ?? 0,
        active: local.active,
        synonyms: local.synonyms,
        source: "woocommerce" as const,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createCatalogCategory(input: {
  payload: CategoryCreatePayload;
  actorId: string;
  request?: Request;
}) {
  const category = await woocommerceClient.createCategory({
    name: input.payload.name,
    slug: input.payload.slug,
    description: input.payload.description,
  });
  const metadata = await catalogTaxonomyRepository.saveCategoryMetadata({
    wooCategoryId: category.id,
    categorySlug: category.slug,
    active: input.payload.active,
    synonyms: input.payload.synonyms,
  });
  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: "internal",
    action: "catalog_category_created",
    entityType: "catalog_category",
    entityId: String(category.id),
    metadata: { slug: category.slug, active: metadata.active },
  });
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    productCount: category.count ?? 0,
    active: metadata.active,
    synonyms: metadata.synonyms,
    source: "woocommerce" as const,
  };
}

export async function updateCatalogCategory(input: {
  id: number;
  payload: CategoryPatchPayload;
  actorId: string;
  request?: Request;
}) {
  const wooPatch = {
    ...(input.payload.name !== undefined ? { name: input.payload.name } : {}),
    ...(input.payload.slug !== undefined ? { slug: input.payload.slug } : {}),
    ...(input.payload.description !== undefined
      ? { description: input.payload.description }
      : {}),
  };
  const category =
    Object.keys(wooPatch).length > 0
      ? await woocommerceClient.updateCategory(input.id, wooPatch)
      : (await woocommerceClient.getCategories()).find(
          (item) => item.id === input.id,
        );
  if (!category) {
    throw createApiError("NOT_FOUND", "Kategori WooCommerce tidak ditemukan.", 404);
  }
  const current = (await catalogTaxonomyRepository.listCategoryMetadata()).find(
    (item) => item.wooCategoryId === input.id,
  );
  const metadata = await catalogTaxonomyRepository.saveCategoryMetadata({
    wooCategoryId: category.id,
    categorySlug: category.slug,
    active: input.payload.active ?? current?.active ?? true,
    synonyms: input.payload.synonyms ?? current?.synonyms ?? [],
  });
  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: "internal",
    action: "catalog_category_updated",
    entityType: "catalog_category",
    entityId: String(category.id),
    metadata: { slug: category.slug, active: metadata.active },
  });
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    productCount: category.count ?? 0,
    active: metadata.active,
    synonyms: metadata.synonyms,
    source: "woocommerce" as const,
  };
}

export async function listIndustryMaster() {
  return catalogTaxonomyRepository.listIndustries();
}

export async function createIndustryMaster(input: {
  payload: IndustryCreatePayload;
  actorId: string;
  request?: Request;
}) {
  const industry = await catalogTaxonomyRepository.createIndustry(input.payload);
  logIndustryAudit("catalog_industry_created", industry, input);
  return industry;
}

export async function updateIndustryMaster(input: {
  id: string;
  payload: IndustryPatchPayload;
  actorId: string;
  request?: Request;
}) {
  const industry = await catalogTaxonomyRepository.updateIndustry(
    input.id,
    input.payload,
  );
  if (!industry) {
    throw createApiError("NOT_FOUND", "Industri tidak ditemukan.", 404);
  }
  logIndustryAudit("catalog_industry_updated", industry, input);
  return industry;
}

export async function listCatalogAttributes(): Promise<CatalogAttribute[]> {
  const attributes = await woocommerceClient.getAttributes();
  return Promise.all(
    attributes.map(async (attribute) => {
      const terms = await woocommerceClient
        .getAttributeTerms(attribute.id)
        .catch(() => []);
      return {
        id: attribute.id,
        name: attribute.name,
        slug: attribute.slug.replace(/^pa_/, ""),
        type: attribute.type ?? "select",
        orderBy: attribute.order_by ?? "menu_order",
        hasArchives: attribute.has_archives ?? false,
        terms: terms.map((term) => ({
          id: term.id,
          name: term.name,
          slug: term.slug,
          productCount: term.count ?? 0,
        })),
        source: "woocommerce" as const,
      };
    }),
  );
}

export async function getPublicCatalogTaxonomy(): Promise<PublicCatalogTaxonomy> {
  const [categoriesResult, industriesResult, attributesResult] =
    await Promise.allSettled([
      listCatalogCategories(),
      listIndustryMaster(),
      listCatalogAttributes(),
    ]);

  const categories =
    categoriesResult.status === "fulfilled"
      ? categoriesResult.value
          .filter((category) => category.active)
          .map(({ name, slug, synonyms }) => ({ name, slug, synonyms }))
      : DEFAULT_PUBLIC_TAXONOMY.categories;
  const industries =
    industriesResult.status === "fulfilled"
      ? industriesResult.value
          .filter((industry) => industry.active)
          .map(({ name, slug, description, synonyms }) => ({
            name,
            slug,
            description,
            synonyms,
          }))
      : DEFAULT_PUBLIC_TAXONOMY.industries;
  const attributes =
    attributesResult.status === "fulfilled" && attributesResult.value.length > 0
      ? attributesResult.value.map(({ name, slug, terms }) => ({
          name,
          slug,
          terms: terms.map(({ name: termName, slug: termSlug }) => ({
            name: termName,
            slug: termSlug,
          })),
        }))
      : DEFAULT_PUBLIC_TAXONOMY.attributes;

  return { categories, industries, attributes };
}

export async function getProductEditorTaxonomyOptions() {
  const [categories, industries, attributes] = await Promise.all([
    listCatalogCategories(),
    listIndustryMaster(),
    listCatalogAttributes(),
  ]);
  return { categories, industries, attributes };
}

function logIndustryAudit(
  action: string,
  industry: IndustryMaster,
  input: { actorId: string; request?: Request },
) {
  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: "internal",
    action,
    entityType: "catalog_industry",
    entityId: industry.id,
    metadata: { slug: industry.slug, active: industry.active },
  });
}
