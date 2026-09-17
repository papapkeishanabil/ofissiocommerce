"use client";

// src/components/catalog/ProductCatalog.tsx

import Link from "next/link";
import { useMemo, useState } from "react";

import type { OfissioProduct } from "@/features/products/product.types";
import {
  normalizeIndustrySlug,
  slugifyTaxonomy,
} from "@/features/catalog-taxonomy/catalog-taxonomy.defaults";
import { ArrowRight, Factory, PackageOpen } from "lucide-react";


import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";
import { CatalogFilterBar } from "./CatalogFilterBar";
import { CatalogProductCard } from "./CatalogProductCard";
import { ProductImagePlaceholder } from "./ProductImagePlaceholder";

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

  const [sort, setSort] = useState("default");
  const sortedProducts = useMemo(() => [...filteredProducts].sort((a,b) => sort === "price-asc" ? a.priceFrom-b.priceFrom : sort === "price-desc" ? b.priceFrom-a.priceFrom : sort === "name" ? a.name.localeCompare(b.name,"id") : 0), [filteredProducts, sort]);

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

  function categoryHref(slug?: string) {
    const params = new URLSearchParams();
    if (industry) params.set("industri", industry);
    if (color) params.set("warna", color);
    if (slug) params.set("kategori", slug);
    return "/catalog" + (params.size ? "?" + params : "");
  }
  return (
    <div className="catalog-page">
      <div className="commerce-breadcrumb-row flex items-center"><Breadcrumbs items={crumbs} /></div>
      <header className="catalog-heading"><h1>Katalog Produk</h1><p>Seragam kerja untuk kebutuhan tim Anda.</p></header>
      {categoryGroups.length > 0 && <nav className="catalog-categories" aria-label="Kategori produk">
        <Link className={"catalog-category-all" + (!category ? " is-active" : "")} href={categoryHref()} aria-current={!category ? "page" : undefined}><PackageOpen size={22}/><span>Semua produk</span></Link>
        {categoryGroups.map(group => <Link key={group.slug} className={"catalog-category" + (category === group.slug ? " is-active" : "")} href={categoryHref(group.slug)} aria-current={category === group.slug ? "page" : undefined}>
          {group.items[0]?.mainImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={group.items[0]?.mainImage} alt="" loading="lazy" />
          ) : <ProductImagePlaceholder name={group.label} category={group.label} accentColor="#10245a" className="h-12 w-10" />}
          <span><b>{group.label}</b><small>{group.items.length} produk</small></span><ArrowRight size={15}/>
        </Link>)}
      </nav>}
      <CatalogFilterBar industry={industry} category={category} color={color} industries={presentIndustries} categories={[]} colors={presentColors} sort={sort} onSortChange={setSort}/>
      <div className="catalog-results-summary" aria-live="polite"><span>{sortedProducts.length} produk{activeCategory ? ", " + activeCategory : ""}{activeIndustry ? ", " + activeIndustry : ""}{activeColor ? ", " + activeColor : ""}</span></div>
      {sortedProducts.length ? <div className="catalog-product-grid">{sortedProducts.map(p=><CatalogProductCard key={p.id} product={p}/>)}</div> : <div className="catalog-empty"><PackageOpen size={36}/><h2>Belum ada produk yang sesuai</h2><p>Coba ubah filter atau lihat pilihan kategori lainnya.</p><Link href="/catalog">Lihat semua produk</Link><div>{alternativeCategories.slice(0,4).map(item=><Link key={item.slug} href={categoryHref(item.slug)}>{item.name}</Link>)}{alternativeIndustries.slice(0,3).map(item=><Link key={item.slug} href={"/catalog?industri="+encodeURIComponent(item.slug)}>{item.name}</Link>)}</div></div>}
      <aside className="catalog-custom"><Factory size={22}/><div><b>Tidak menemukan produk yang sesuai?</b><p>Buat brief Seragam Full Custom sesuai kebutuhan tim Anda.</p></div><Link href="/custom-request">Buat Brief Full Custom <ArrowRight size={16}/></Link></aside>
    </div>
  );
}
