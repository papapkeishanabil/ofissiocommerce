// src/components/catalog/ProductCatalog.tsx

import { useMemo } from "react";

import { productService } from "@/features/products/product.service";
import { INDUSTRIES, CATEGORIES } from "@/types/industry";
import { PackageOpen } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { ProductCard } from "./ProductCard";

interface ProductCatalogProps {
  /** industry filter (from query string) */
  industry?: string;
  /** category filter */
  category?: string;
}

export function ProductCatalog({ industry, category }: ProductCatalogProps) {
  const products = useMemo(() => {
    let list = productService.getPublishedProducts();
    if (industry) {
      list = list.filter((p) =>
        p.industries.includes(industry as (typeof INDUSTRIES)[number]),
      );
    }
    if (category) {
      list = list.filter((p) => p.category === category);
    }
    return list;
  }, [industry, category]);

  const activeIndustry = INDUSTRIES.find((i) => i === industry);
  const activeCategory = CATEGORIES.find((c) => c === category);

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

      {products.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-16 text-center">
          <PackageOpen className="mb-3 h-12 w-12 text-slate-300" />
          <p className="text-sm font-semibold text-ink">
            Belum ada produk published dengan model 3D yang valid.
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Coba industri atau kategori lain.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
