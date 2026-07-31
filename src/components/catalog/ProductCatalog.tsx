// src/components/catalog/ProductCatalog.tsx

import Link from "next/link";
import { useMemo } from "react";

import type { OfissioProduct } from "@/features/products/product.types";
import {
  normalizeIndustrySlug,
  slugifyTaxonomy,
} from "@/features/catalog-taxonomy/catalog-taxonomy.defaults";
import { PackageOpen } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { ProductCard } from "./ProductCard";

interface ProductCatalogProps {
  products: OfissioProduct[];
  /** industry filter (from query string) */
  industry?: string;
  /** category filter */
  category?: string;
  industryLabel?: string;
  categoryLabel?: string;
  categoryStrict?: boolean;
  alternativeCategories?: Array<{ name: string; slug: string }>;
  alternativeIndustries?: Array<{ name: string; slug: string }>;
}

export function ProductCatalog({
  products,
  industry,
  category,
  industryLabel,
  categoryLabel,
  categoryStrict = true,
  alternativeCategories = [],
  alternativeIndustries = [],
}: ProductCatalogProps) {
  const filteredProducts = useMemo(() => {
    let list = products;
    if (industry) {
      list = list.filter(
        (p) =>
          p.industrySlugs?.includes(industry) ||
          p.industries.some((item) => normalizeIndustrySlug(item) === industry),
      );
    }
    if (category) {
      list = list.filter(
        (p) => {
          if (categoryStrict) {
            return (
              p.categorySlugs?.includes(category) ||
              slugifyTaxonomy(p.category) === category
            );
          }
          const haystack = [
            p.name,
            p.sku,
            p.category,
            ...(p.searchableTerms ?? []),
          ]
            .join(" ")
            .toLowerCase();
          return category.split("-").every((term) => haystack.includes(term));
        },
      );
    }
    return list;
  }, [products, industry, category, categoryStrict]);

  const activeIndustry = industry ? industryLabel ?? industry : undefined;
  const activeCategory = category ? categoryLabel ?? category : undefined;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink lg:text-3xl">
          Katalog Produk
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {activeIndustry || activeCategory
            ? "Hasil filter:"
            : "Temukan seragam kerja untuk setiap industri."}
        </p>
        {(activeIndustry || activeCategory) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeIndustry && (
              <Badge tone="brand" className="px-3 py-1">
                Industri: {activeIndustry}
              </Badge>
            )}
            {activeCategory && (
              <Badge tone="brand" className="px-3 py-1">
                Kategori: {activeCategory}
              </Badge>
            )}
          </div>
        )}
      </header>

      {filteredProducts.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-16 text-center">
          <PackageOpen className="mb-3 h-12 w-12 text-slate-300" />
          <p className="text-sm font-semibold text-ink">
            Belum ada produk published dengan model 3D yang valid.
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Coba industri atau kategori lain.
          </p>
          <div className="mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
            {alternativeCategories.slice(0, 4).map((item) => (
              <Link
                key={`category-${item.slug}`}
                href={`/catalog?kategori=${encodeURIComponent(item.slug)}`}
                className="rounded-full border border-line bg-white px-3 py-2 text-xs font-bold text-brand-700 transition hover:border-brand-300 hover:bg-brand-50"
              >
                {item.name}
              </Link>
            ))}
            {alternativeIndustries.slice(0, 3).map((item) => (
              <Link
                key={`industry-${item.slug}`}
                href={`/catalog?industri=${encodeURIComponent(item.slug)}`}
                className="rounded-full border border-line bg-white px-3 py-2 text-xs font-bold text-ink-muted transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
