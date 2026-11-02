"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { formatIDR } from "@/types/product";
import { filterGuideProducts, type GuideProduct } from "./product-guide";
import styles from "./ProductGuide.module.css";

const emptyFilters = { query: "", category: "", gender: "", sleeve: "" };

export function GuideCatalog({ products }: { products: GuideProduct[] }) {
  const [filters, setFilters] = useState(emptyFilters);
  const categories = [...new Map(products.flatMap(product => product.categories).map(category => [category.slug, category])).values()].sort((a, b) => a.name.localeCompare(b.name, "id"));
  const visible = filterGuideProducts(products, filters);
  const set = (key: keyof typeof filters, value: string) => setFilters(previous => ({ ...previous, [key]: value }));
  return <section id="semua-produk" className={styles.catalog} aria-labelledby="guide-products-title">
    <div className={styles.sectionHeading}>
      <div><p className={styles.eyebrow}>Seluruh katalog aktif</p><h2 id="guide-products-title">Bandingkan pilihan Anda.</h2></div>
      <p>Telusuri model, bahan, dan ukuran. Buka produk untuk melihat warna, stok, serta rincian harga setiap varian.</p>
    </div>
    <div className={styles.filters}>
      <label className={styles.search}><span>Cari produk atau bahan</span><div><Search size={18} aria-hidden="true" /><input type="search" value={filters.query} onChange={event => set("query", event.target.value)} placeholder="Contoh: KM, Twil Katun, safety" /></div></label>
      <label><span>Kategori</span><select aria-label="Kategori" value={filters.category} onChange={event => set("category", event.target.value)}><option value="">Semua kategori</option>{categories.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label>
      <label><span>Gender</span><select aria-label="Gender" value={filters.gender} onChange={event => set("gender", event.target.value)}><option value="">Semua gender</option>{[...new Set(products.map(product => product.gender))].sort().map(gender => <option key={gender}>{gender}</option>)}</select></label>
      <label><span>Lengan</span><select aria-label="Lengan" value={filters.sleeve} onChange={event => set("sleeve", event.target.value)}><option value="">Semua lengan</option><option>Pendek</option><option>Panjang</option></select></label>
    </div>
    <div className={styles.results}><p role="status">Menampilkan <strong>{visible.length}</strong> dari {products.length} produk</p><button type="button" onClick={() => setFilters(emptyFilters)}>Reset filter</button></div>
    <div className={styles.productList}>
      {visible.map(product => <article key={product.slug} className={styles.product} data-guide-product={product.slug}>
        <div className={styles.productTitle}><p>{product.categories.map(category => category.name).join(" · ") || "Produk Ofissio"}</p><h3><Link prefetch={false} href={`/product/${product.slug}`}>{product.name}<ArrowUpRight size={17} aria-hidden="true" /></Link></h3></div>
        <dl><div><dt>Bahan</dt><dd>{product.material || "Lihat detail produk"}</dd></div><div><dt>Gender / lengan</dt><dd>{product.gender} · {product.sleeves.join(" / ")}</dd></div><div><dt>Ukuran tersedia</dt><dd>{product.sizes.join(", ") || "Lihat detail produk"}</dd></div></dl>
        <div className={styles.price}><span>Harga mulai</span><strong>{product.price > 0 ? formatIDR(product.price) : "Hubungi Ofissio"}</strong><Link prefetch={false} href={`/product/${product.slug}`}>Lihat produk <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
      </article>)}
    </div>
    {visible.length === 0 && <div className={styles.empty}><h3>Belum ada produk yang cocok.</h3><p>Coba kata lain atau hapus sebagian filter.</p><button type="button" onClick={() => setFilters(emptyFilters)}>Tampilkan semua produk</button></div>}
    <p className={styles.note}>Harga mulai mengikuti pilihan produk dan dapat berbeda antarvarian. Periksa biaya bordir, ongkos kirim, dan ketersediaan pada saat memesan.</p>
  </section>;
}
