"use client";

import Link from "next/link";
import { ArrowRight, Box } from "lucide-react";
import type { OfissioProduct } from "@/features/products/product.types";
import { validateProduct3DModel } from "@/features/products/product.validation";
import { formatIDR } from "@/types/product";
import { fulfillmentLabel } from "@/types/industry";
import { productColorDisplayLabel } from "@/lib/product-colors";
import { ProductImagePreview } from "./ProductImagePreview";
import { catalogColorPreview, catalogColorSwatchStyle } from "./catalog-colors";
import styles from "./CatalogProductCard.module.css";

export function CatalogProductCard({ product, colorFilter }: { product: OfissioProduct; colorFilter?: string }) {
  const preview = catalogColorPreview(product, colorFilter);
  const href = `/product/${product.slug}`;
  const colors = [...new Map((product.available_colors?.length ? product.available_colors : product.colors ?? [])
    .map(color => color.trim()).filter(Boolean).map(color => [color.toLocaleLowerCase("id-ID"), color])).values()];
  const orderedColors = preview.color ? [preview.color, ...colors.filter(color => color.toLocaleLowerCase("id-ID") !== preview.color?.toLocaleLowerCase("id-ID"))] : colors;
  const sizes = [...new Set((product.available_sizes ?? []).map(size => size.trim()).filter(Boolean))];
  const material = product.material?.trim();
  const specifications = [material && material !== "Material belum diisi" ? material : undefined, product.safety_features?.[0]?.trim()
    || (product.sleeve_type === "short" ? "Lengan pendek" : product.sleeve_type === "long" ? "Lengan panjang" : undefined)].filter(Boolean);
  return <article className={`catalog-product-card ${styles.card}`}>
    <ProductImagePreview product={preview.product} className={`catalog-product-photo ${styles.photo}`}>
      <span className={`catalog-photo-badges ${styles.badges}`}>
        <span className={product.fulfillment === "READY_STOCK" ? "catalog-stock-ready" : "catalog-stock-order"}>{fulfillmentLabel(product.fulfillment)}</span>
        {validateProduct3DModel(product).ok && <span className="catalog-model-badge" aria-label="3D tersedia"><Box size={12} aria-hidden="true" />3D</span>}
      </span>
    </ProductImagePreview>
    <div className={`catalog-card-content ${styles.content}`}>
      <p className={styles.category}>{product.category}</p>
      <h2><Link href={href}>{product.name}</Link></h2>
      {specifications.length > 0 && <p className={styles.specifications}>{specifications.join(" · ")}</p>}
      {preview.color && preview.usesMainPhoto && <p className={styles.photoNote}>Foto menampilkan warna utama; tersedia {productColorDisplayLabel(preview.color)}.</p>}
      {(colors.length > 0 || sizes.length > 0) && <dl className={styles.variants}>
        {colors.length > 0 && <div className={styles.variantRow}>
          <dt>Warna</dt><dd className={styles.colors}>
            <span className={styles.swatches}>{orderedColors.slice(0, 4).map(color => <span key={color} role="img" aria-label={productColorDisplayLabel(color)} title={productColorDisplayLabel(color)} className={styles.swatch} style={catalogColorSwatchStyle(color)}/>)}</span>
            <span>{preview.color ? productColorDisplayLabel(preview.color) : colors.length === 1 ? productColorDisplayLabel(colors[0]!) : `${colors.length} warna`}</span>
          </dd>
        </div>}
        {sizes.length > 0 && <div className={styles.variantRow}>
          <dt>Ukuran</dt><dd className={styles.sizes}>{sizes.map(size => <span key={size}>{size}</span>)}</dd>
        </div>}
      </dl>}
      <div className={styles.purchase}>
        <p className={styles.price}><strong>{formatIDR(product.priceFrom)}</strong><span>/pcs</span></p>
        <p className={styles.minimum}>Min. pembelian {Math.max(1, product.moq)} pcs</p>
        <Link className={styles.detail} href={href} aria-label={`Lihat Detail ${product.name}`}>Lihat Detail <ArrowRight size={16} aria-hidden="true"/></Link>
      </div>
    </div>
  </article>;
}
