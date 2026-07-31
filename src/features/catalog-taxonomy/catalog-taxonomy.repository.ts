import "server-only";

import { randomUUID } from "node:crypto";

import { SupabaseDatabaseError } from "@/features/database/database.errors";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import { getRepositoryProvider } from "@/features/repositories/repository.config";

import { DEFAULT_INDUSTRIES } from "./catalog-taxonomy.defaults";
import type {
  CatalogCategoryMetadata,
  CatalogTaxonomyRepository,
  IndustryMaster,
} from "./catalog-taxonomy.types";

type CatalogTaxonomyGlobal = typeof globalThis & {
  __ofissioCatalogCategoryMetadata?: Map<string, CatalogCategoryMetadata>;
  __ofissioIndustryMaster?: Map<string, IndustryMaster>;
};

const taxonomyGlobal = globalThis as CatalogTaxonomyGlobal;
const categoryMetadata =
  taxonomyGlobal.__ofissioCatalogCategoryMetadata ??
  (taxonomyGlobal.__ofissioCatalogCategoryMetadata = new Map());
const industries =
  taxonomyGlobal.__ofissioIndustryMaster ??
  (taxonomyGlobal.__ofissioIndustryMaster = new Map(
    DEFAULT_INDUSTRIES.map((industry) => [industry.id, { ...industry }]),
  ));

const mockCatalogTaxonomyRepository: CatalogTaxonomyRepository = {
  async listCategoryMetadata() {
    return [...categoryMetadata.values()];
  },
  async saveCategoryMetadata(input) {
    const current = [...categoryMetadata.values()].find(
      (item) => item.wooCategoryId === input.wooCategoryId,
    );
    const now = new Date().toISOString();
    const next: CatalogCategoryMetadata = {
      id: current?.id ?? `category-meta-${randomUUID()}`,
      ...input,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    };
    categoryMetadata.set(next.id, next);
    return next;
  },
  async listIndustries() {
    return [...industries.values()].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );
  },
  async createIndustry(input) {
    const duplicate = [...industries.values()].some(
      (item) => item.slug === input.slug,
    );
    if (duplicate) {
      throw new Error("industry_slug_exists");
    }
    const now = new Date().toISOString();
    const next: IndustryMaster = {
      id: `industry-${randomUUID()}`,
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    industries.set(next.id, next);
    return next;
  },
  async updateIndustry(id, patch) {
    const current = industries.get(id);
    if (!current) return null;
    const next: IndustryMaster = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    industries.set(id, next);
    return next;
  },
};

const supabaseCatalogTaxonomyRepository: CatalogTaxonomyRepository = {
  async listCategoryMetadata() {
    const client = getSupabaseAdminClient();
    if (!client) return mockCatalogTaxonomyRepository.listCategoryMetadata();
    return fallbackWhenSchemaMissing(
      async () => {
        const rows = await client.select("catalog_category_metadata", {
          order: "category_slug.asc",
        });
        return rows.map(rowToCategoryMetadata);
      },
      () => mockCatalogTaxonomyRepository.listCategoryMetadata(),
    );
  },
  async saveCategoryMetadata(input) {
    const client = getSupabaseAdminClient();
    if (!client) return mockCatalogTaxonomyRepository.saveCategoryMetadata(input);
    return fallbackWhenSchemaMissing(
      async () => {
        const existing = await client.select("catalog_category_metadata", {
          filters: { woo_category_id: input.wooCategoryId },
          limit: 1,
        });
        const now = new Date().toISOString();
        if (existing[0]) {
          const rows = await client.update(
            "catalog_category_metadata",
            {
              category_slug: input.categorySlug,
              active: input.active,
              synonyms: input.synonyms,
              updated_at: now,
            },
            { woo_category_id: input.wooCategoryId },
          );
          return rowToCategoryMetadata(rows[0] ?? existing[0]);
        }
        const rows = await client.insert("catalog_category_metadata", {
          id: `category-meta-${randomUUID()}`,
          woo_category_id: input.wooCategoryId,
          category_slug: input.categorySlug,
          active: input.active,
          synonyms: input.synonyms,
          created_at: now,
          updated_at: now,
        });
        const row = rows[0];
        if (!row) throw new Error("catalog_category_metadata_insert_empty");
        return rowToCategoryMetadata(row);
      },
      () => mockCatalogTaxonomyRepository.saveCategoryMetadata(input),
    );
  },
  async listIndustries() {
    const client = getSupabaseAdminClient();
    if (!client) return mockCatalogTaxonomyRepository.listIndustries();
    return fallbackWhenSchemaMissing(
      async () => {
        const rows = await client.select("industries", {
          order: "sort_order.asc,name.asc",
        });
        return rows.map(rowToIndustry);
      },
      () => mockCatalogTaxonomyRepository.listIndustries(),
    );
  },
  async createIndustry(input) {
    const client = getSupabaseAdminClient();
    if (!client) return mockCatalogTaxonomyRepository.createIndustry(input);
    return fallbackWhenSchemaMissing(
      async () => {
        const now = new Date().toISOString();
        const rows = await client.insert("industries", {
          id: `industry-${randomUUID()}`,
          name: input.name,
          slug: input.slug,
          description: input.description,
          active: input.active,
          synonyms: input.synonyms,
          sort_order: input.sortOrder,
          created_at: now,
          updated_at: now,
        });
        const row = rows[0];
        if (!row) throw new Error("industry_insert_empty");
        return rowToIndustry(row);
      },
      () => mockCatalogTaxonomyRepository.createIndustry(input),
    );
  },
  async updateIndustry(id, patch) {
    const client = getSupabaseAdminClient();
    if (!client) return mockCatalogTaxonomyRepository.updateIndustry(id, patch);
    return fallbackWhenSchemaMissing(
      async () => {
        const rowPatch: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        if (patch.name !== undefined) rowPatch.name = patch.name;
        if (patch.slug !== undefined) rowPatch.slug = patch.slug;
        if (patch.description !== undefined) rowPatch.description = patch.description;
        if (patch.active !== undefined) rowPatch.active = patch.active;
        if (patch.synonyms !== undefined) rowPatch.synonyms = patch.synonyms;
        if (patch.sortOrder !== undefined) rowPatch.sort_order = patch.sortOrder;
        const rows = await client.update("industries", rowPatch, { id });
        return rows[0] ? rowToIndustry(rows[0]) : null;
      },
      () => mockCatalogTaxonomyRepository.updateIndustry(id, patch),
    );
  },
};

export const catalogTaxonomyRepository =
  getRepositoryProvider() === "supabase"
    ? supabaseCatalogTaxonomyRepository
    : mockCatalogTaxonomyRepository;

function rowToCategoryMetadata(
  row: Record<string, unknown>,
): CatalogCategoryMetadata {
  return {
    id: String(row.id),
    wooCategoryId: Number(row.woo_category_id),
    categorySlug: String(row.category_slug ?? ""),
    active: row.active !== false,
    synonyms: stringArray(row.synonyms),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function rowToIndustry(row: Record<string, unknown>): IndustryMaster {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    slug: String(row.slug ?? ""),
    description: String(row.description ?? ""),
    active: row.active !== false,
    synonyms: stringArray(row.synonyms),
    sortOrder: Number(row.sort_order ?? 100),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

async function fallbackWhenSchemaMissing<T>(
  read: () => Promise<T>,
  fallback: () => Promise<T>,
) {
  try {
    return await read();
  } catch (error) {
    if (
      error instanceof SupabaseDatabaseError &&
      error.reason === "relation_does_not_exist"
    ) {
      return fallback();
    }
    throw error;
  }
}
