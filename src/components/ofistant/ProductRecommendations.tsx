"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageOff } from "lucide-react";
import type { OfistantProductRecommendation } from "@/lib/ofistant/ofistant.types";
import { formatIDR } from "@/types/product";
import styles from "./OfistantChat.module.css";

function Recommendation({ product, onNavigate }: { product: OfistantProductRecommendation; onNavigate?: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const href = `/product/${encodeURIComponent(product.slug)}`;
  return <article className={styles.productCard} aria-label={product.name}>
    <div className={styles.productPhoto}>
      {product.image && !imageFailed
        ? <Image src={product.image} alt={product.name} fill unoptimized sizes="320px" onError={() => setImageFailed(true)} />
        : <span className={styles.missingPhoto}><ImageOff size={24} aria-hidden="true" />Foto produk belum tersedia</span>}
    </div>
    <div className={styles.productInfo}>
      <h3>{product.name}</h3>
      {product.material && product.material !== "Material belum diisi" && <p>{product.material}</p>}
      {Number.isFinite(product.priceFrom) && product.priceFrom > 0 && <p className={styles.productPrice}>Mulai {formatIDR(product.priceFrom)}<span> /pcs</span></p>}
      <Link href={href} className={styles.productDetail} aria-label={`Lihat detail ${product.name}`} onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) onNavigate?.(); }}>Lihat detail<ArrowRight size={15} aria-hidden="true" /></Link>
    </div>
  </article>;
}

export function ProductRecommendations({ products, moreProductsHref, onNavigate }: {
  products: OfistantProductRecommendation[];
  moreProductsHref?: string;
  onNavigate?: () => void;
}) {
  return <div className={styles.recommendations}>
    <div className={styles.productList} aria-label="Pilihan produk Ofistant">
      {products.map(product => <Recommendation key={product.id} product={product} onNavigate={onNavigate} />)}
    </div>
    <Link href={moreProductsHref?.startsWith("/catalog") ? moreProductsHref : "/catalog"} className={styles.moreProducts} onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) onNavigate?.(); }}>Lihat produk lain<ArrowRight size={15} aria-hidden="true" /></Link>
  </div>;
}
