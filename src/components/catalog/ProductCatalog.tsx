"use client";

// src/components/catalog/ProductCatalog.tsx

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";

import type { OfissioProduct } from "@/features/products/product.types";
import {
  normalizeIndustrySlug,
  slugifyTaxonomy,
} from "@/features/catalog-taxonomy/catalog-taxonomy.defaults";
import { ArrowRight, Factory, PackageOpen, LayoutGrid, List, Search } from "lucide-react";


import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";
import { CatalogFilterBar } from "./CatalogFilterBar";
import { CatalogProductCard } from "./CatalogProductCard";
import { ProductImagePlaceholder } from "./ProductImagePlaceholder";
import { CATALOG_COLOR_FAMILIES, matchesCatalogColor } from "./catalog-colors";

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

  function facetValues(p: OfissioProduct): Record<string,string[]> {
    return { Gender:p.gender === "men" ? ["Pria"] : p.gender === "women" ? ["Wanita"] : ["Pria", "Wanita"], Ukuran:p.available_sizes ?? [], Bahan:p.material ? [p.material] : [], Fitur:p.safety_features ?? [], Ketersediaan:[p.fulfillment === "READY_STOCK" ? "Ready Stock" : "Made to Order"] };
  }

function categoryPreviewProducts(items: OfissioProduct[], gender?: string) {
  const withImages = items.filter(product => Boolean(product.mainImage));
  if (gender) {
    const target = gender === "Pria" ? "men" : "women";
    const product = withImages.find(product => product.gender === target)
      ?? withImages.find(product => product.gender === "unisex");
    return product ? [product] : [];
  }
  const men = withImages.find(product => product.gender === "men");
  const women = withImages.find(product => product.gender === "women");
  if (men && women && men.mainImage !== women.mainImage) return [men, women];
  return withImages.slice(0, 1);
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
            matchesCatalogColor(c, color),
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
    for (const category of taxonomyCategories) {
      if (category.slug === "uncategorized") continue;
      groups.set(category.slug, { slug: category.slug, label: category.name, items: [] });
    }
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
  const [selected, setSelected] = useState<Record<string,string>>({});
  const facets: Record<string,string[]> = {};
  for (const product of products) for (const [key,values] of Object.entries(facetValues(product))) facets[key] = [...new Set([...(facets[key] ?? []), ...values.filter(Boolean)])];
  const [query, setQuery] = useState("");
  const [view, setView] = useState("grid");
  const sortedProducts = useMemo(() => filteredProducts.filter(p => Object.entries(selected).every(([key,value]) => !value || facetValues(p)[key]?.includes(value))).filter(p => [p.name,p.sku,p.category,...(p.searchableTerms ?? [])].join(" ").toLocaleLowerCase("id").includes(query.trim().toLocaleLowerCase("id"))).sort((a,b) => sort === "price-asc" ? a.priceFrom-b.priceFrom : sort === "price-desc" ? b.priceFrom-a.priceFrom : sort === "name" ? a.name.localeCompare(b.name,"id") : 0), [filteredProducts, sort, query, selected]);

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
    ? CATALOG_COLOR_FAMILIES.find(family => family.slug === color)?.label ?? presentColors.find((c) => c.slug === color)?.label ?? color
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
      <div className="catalog-semantic-heading"><Breadcrumbs items={crumbs} /></div>
      <header className="catalog-heading"><h1>Katalog Produk</h1><p>Seragam kerja untuk kebutuhan tim Anda.</p></header>
      {categoryGroups.length > 0 && <nav className="catalog-categories" aria-label="Kategori produk">
        <Link className={"catalog-category-all" + (!category ? " is-active" : "")} href={categoryHref()} aria-current={!category ? "page" : undefined}><span className="catalog-category-visual"><LayoutGrid size={26}/></span><span className="catalog-category-copy"><b>Semua Produk</b><small>{products.length} produk</small></span><ArrowRight size={16}/></Link>
        {categoryGroups.map(group => {
          const previews = categoryPreviewProducts(group.items, selected.Gender);
          return <Link key={group.slug} className={"catalog-category" + (category === group.slug ? " is-active" : "")} href={categoryHref(group.slug)} aria-current={category === group.slug ? "page" : undefined}>
          <span className={"catalog-category-visual" + (previews.length > 1 ? " catalog-category-pair" : "")}>
            {previews.length ? previews.map(product => <span className="catalog-category-thumbnail" key={product.id}>
              <Image src={product.mainImage!} alt={`${group.label}: ${product.gender === "men" ? "pria" : product.gender === "women" ? "wanita" : "unisex"}`} fill sizes={previews.length > 1 ? "40px" : "56px"} className="catalog-category-image" />
            </span>) : <ProductImagePlaceholder name={group.label} category={group.label} accentColor="#10245a" className="h-12 w-10" />}
          </span>
          <span className="catalog-category-copy"><b>{group.label}</b><small>{group.items.length} produk</small></span><ArrowRight size={15}/>
        </Link>;})}
      </nav>}
      <div className="catalog-workspace">
      <CatalogFilterBar industry={industry} category={category} color={color} industries={presentIndustries} colors={presentColors} total={products.length} facets={facets} selected={selected} onFacetChange={(key,value) => setSelected(previous => ({...previous,[key]:value}))} onReset={() => { setSelected({}); setQuery(""); }}/>
      <section className="catalog-results" aria-label="Produk katalog">
      <div className="catalog-toolbar"><label className="catalog-search"><Search size={22}/><input type="search" aria-label="Cari produk dalam katalog" placeholder="Cari produk dalam katalog..." value={query} onChange={event => setQuery(event.target.value)}/></label><label className="catalog-sort">Urutkan <select aria-label="Urutkan produk" value={sort} onChange={event => setSort(event.target.value)}><option value="default">Rekomendasi</option><option value="price-asc">Harga terendah</option><option value="price-desc">Harga tertinggi</option><option value="name">Nama A-Z</option></select></label><div className="catalog-view" aria-label="Tampilan produk">{[{value:"grid",Icon:LayoutGrid,label:"Grid"},{value:"list",Icon:List,label:"Daftar"}].map(({value,Icon,label}) => <button key={value} type="button" aria-label={label} aria-pressed={view === value} onClick={() => setView(value)}><Icon size={22}/></button>)}</div></div>
      <div className="catalog-results-summary" aria-live="polite"><span>{sortedProducts.length} produk{activeCategory ? ", " + activeCategory : ""}{activeIndustry ? ", " + activeIndustry : ""}{activeColor ? ", " + activeColor : ""}</span></div>
      {sortedProducts.length ? <div className={"catalog-product-grid" + (view === "list" ? " is-list" : "")}>{sortedProducts.map(p=><CatalogProductCard key={p.id} product={p} colorFilter={color}/>)}</div> : <div className="catalog-empty"><PackageOpen size={36}/><h2>Belum ada produk yang sesuai</h2><p>Coba ubah filter atau lihat pilihan kategori lainnya.</p><Link href="/catalog">Lihat semua produk</Link><div>{alternativeCategories.slice(0,4).map(item=><Link key={item.slug} href={categoryHref(item.slug)}>{item.name}</Link>)}{alternativeIndustries.slice(0,3).map(item=><Link key={item.slug} href={"/catalog?industri="+encodeURIComponent(item.slug)}>{item.name}</Link>)}</div></div>}
      </section></div>
      <aside className="catalog-custom"><Factory size={22}/><div><b>Tidak menemukan produk yang sesuai?</b><p>Buat brief Seragam Full Custom sesuai kebutuhan tim Anda.</p></div><Link href="/custom-request">Buat Brief Full Custom <ArrowRight size={16}/></Link></aside>
    </div>
  );
}
