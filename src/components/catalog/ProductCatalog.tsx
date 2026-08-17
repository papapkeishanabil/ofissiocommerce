// src/components/catalog/ProductCatalog.tsx

import Link from "next/link";
import { useMemo } from "react";

import type { OfissioProduct } from "@/features/products/product.types";
import {
  normalizeIndustrySlug,
  slugifyTaxonomy,
} from "@/features/catalog-taxonomy/catalog-taxonomy.defaults";
import { ArrowRight, Factory, PackageOpen } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";
import { CatalogFilterBar } from "./CatalogFilterBar";
import { ProductCard } from "./ProductCard";

interface ProductCatalogProps {
  products: OfissioProduct[];
  /** industry filter (from query string) */
  industry?: string;
  /** category filter */
  category?: string;
  industryLabel?: string;
  categoryLabel?: string;
  /** filter warna (slug dari available_colors) */
  color?: string;
  categoryStrict?: boolean;
  /** Kategori taxonomy (urutan + label resmi) untuk mode landing. */
  taxonomyCategories?: Array<{ name: string; slug: string }>;
  /** Industri taxonomy (label resmi) untuk filter berdasarkan industri. */
  taxonomyIndustries?: Array<{ name: string; slug: string }>;
  alternativeCategories?: Array<{ name: string; slug: string }>;
  alternativeIndustries?: Array<{ name: string; slug: string }>;
}

/** Preview maksimum per kategori di mode landing. */
const PREVIEW_PER_CATEGORY = 3;

function categoryLabelFromSlug(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function ProductCatalog({
  products,
  industry,
  category,
  industryLabel,
  categoryLabel,
  color,
  categoryStrict = true,
  taxonomyCategories = [],
  taxonomyIndustries = [],
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
    if (color) {
      list = list.filter((p) =>
        p.available_colors?.some(
          (c) =>
            slugifyTaxonomy(c) === color || c.toLowerCase() === color.toLowerCase(),
        ),
      );
    }
    return list;
  }, [products, industry, category, color, categoryStrict]);

  // Mode landing (tanpa filter): kelompokkan produk per kategori nyata —
  // hanya kategori yang punya produk, urut mengikuti taxonomy. Customer
  // melihat preview beberapa produk per kategori, lalu mengeksplorasi
  // kategori penuh via tombol "Lihat produk lainnya".
  const categoryGroups = useMemo(() => {
    const groups = new Map<
      string,
      { slug: string; label: string; items: OfissioProduct[] }
    >();
    for (const p of products) {
      const slugs =
        p.categorySlugs?.length && p.categorySlugs.some(Boolean)
          ? p.categorySlugs
          : p.category
            ? [slugifyTaxonomy(p.category)]
            : [];
      for (const slug of slugs) {
        if (!slug) continue;
        const known = taxonomyCategories.find((c) => c.slug === slug);
        const group =
          groups.get(slug) ??
          {
            slug,
            label: known?.name ?? p.category ?? categoryLabelFromSlug(slug),
            items: [] as OfissioProduct[],
          };
        group.items.push(p);
        groups.set(slug, group);
      }
    }
    const order = new Map(taxonomyCategories.map((c, i) => [c.slug, i]));
    return [...groups.values()].sort(
      (a, b) => (order.get(a.slug) ?? 999) - (order.get(b.slug) ?? 999),
    );
  }, [products, taxonomyCategories]);

  const isLanding = !industry && !category && !color;

  // Warna yang benar-benar tersedia pada produk — basis chip filter "Warna".
  const presentColors = useMemo(() => {
    const map = new Map<
      string,
      { slug: string; label: string; count: number }
    >();
    for (const p of products) {
      for (const raw of p.available_colors ?? []) {
        const label = raw.trim();
        if (!label) continue;
        const slug = slugifyTaxonomy(label);
        const entry =
          map.get(slug) ??
          {
            slug,
            label: label.charAt(0).toUpperCase() + label.slice(1),
            count: 0,
          };
        entry.count += 1;
        map.set(slug, entry);
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [products]);

  const activeColor = color
    ? presentColors.find((c) => c.slug === color)?.label ?? color
    : undefined;

  // Industri yang benar-benar punya produk — basis chip filter "Industri".
  const presentIndustries = useMemo(() => {
    const groups = new Map<string, { slug: string; label: string; count: number }>();
    for (const p of products) {
      const slugs =
        p.industrySlugs?.length && p.industrySlugs.some(Boolean)
          ? p.industrySlugs
          : p.industries.map(normalizeIndustrySlug);
      for (const slug of new Set(slugs)) {
        if (!slug) continue;
        const known = taxonomyIndustries.find((i) => i.slug === slug);
        const group =
          groups.get(slug) ??
          {
            slug,
            label: known?.name ?? categoryLabelFromSlug(slug),
            count: 0,
          };
        group.count += 1;
        groups.set(slug, group);
      }
    }
    const order = new Map(taxonomyIndustries.map((i, idx) => [i.slug, idx]));
    return [...groups.values()].sort(
      (a, b) => (order.get(a.slug) ?? 999) - (order.get(b.slug) ?? 999),
    );
  }, [products, taxonomyIndustries]);

  const activeIndustry = industry ? industryLabel ?? industry : undefined;
  const activeCategory = category ? categoryLabel ?? category : undefined;

  const crumbs: Crumb[] = [
    { label: "Beranda", href: "/" },
    { label: "Katalog" },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
      <Breadcrumbs items={crumbs} className="mb-4" />
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink lg:text-3xl">
          Katalog Produk
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {activeIndustry || activeCategory || activeColor
            ? "Hasil filter:"
            : "Temukan seragam kerja untuk setiap industri."}
        </p>
        {(activeIndustry || activeCategory || activeColor) && (
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
            {activeColor && (
              <Badge tone="brand" className="px-3 py-1">
                Warna: {activeColor}
              </Badge>
            )}
          </div>
        )}
      </header>

      {(categoryGroups.length > 0 ||
        presentIndustries.length > 0 ||
        presentColors.length > 0) && (
        <CatalogFilterBar
          industry={industry}
          category={category}
          color={color}
          industries={presentIndustries}
          categories={categoryGroups.map((g) => ({
            slug: g.slug,
            label: g.label,
            count: g.items.length,
          }))}
          colors={presentColors}
        />
      )}

      <aside className="mb-6 flex flex-col gap-4 rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 to-white p-4 shadow-soft-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-800 text-white">
            <Factory className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-extrabold text-ink">Tidak menemukan model yang sesuai?</p>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-muted">
              Untuk desain, model, bahan, pola, kombinasi warna, atau size chart milik
              perusahaan sendiri, Anda tidak perlu memilih produk. Mulai langsung dari
              brief Seragam Full Custom.
            </p>
          </div>
        </div>
        <Link
          href="/custom-request"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          Buat brief Full Custom
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </aside>

      {isLanding ? (
        categoryGroups.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-16 text-center">
            <PackageOpen className="mb-3 h-12 w-12 text-slate-300" />
            <p className="text-sm font-semibold text-ink">
              Belum ada produk published dengan model 3D yang valid.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {categoryGroups.map((group) => (
              <section key={group.slug} aria-labelledby={`kategori-${group.slug}`}>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2
                      id={`kategori-${group.slug}`}
                      className="text-xl font-bold text-ink-strong"
                    >
                      {group.label}
                    </h2>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {group.items.length} produk
                    </p>
                  </div>
                  <Link
                    href={`/catalog?kategori=${encodeURIComponent(group.slug)}`}
                    className="group inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 text-sm font-bold text-white shadow-soft-md transition-colors duration-200 hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  >
                    Lihat produk lainnya
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {group.items.slice(0, PREVIEW_PER_CATEGORY).map((p) => (
                    <ProductCard key={`${group.slug}-${p.id}`} product={p} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )
      ) : filteredProducts.length === 0 ? (
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
