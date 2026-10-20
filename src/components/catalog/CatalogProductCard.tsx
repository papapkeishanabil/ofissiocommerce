"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Clock, Layers, Box, PackageCheck } from "lucide-react";
import type { OfissioProduct } from "@/features/products/product.types";
import { validateProduct3DModel } from "@/features/products/product.validation";
import { resolveOrderProcessingInfo } from "@/features/products/order-processing";
import { formatIDR } from "@/types/product";
import { fulfillmentLabel } from "@/types/industry";
import { ProductImagePlaceholder } from "./ProductImagePlaceholder";

export function CatalogProductCard({ product }: { product: OfissioProduct }) {
  const [failed, setFailed] = useState(false);
  const href = `/product/${product.slug}`;
  const processingInfo = resolveOrderProcessingInfo({ processRoute: product.processRoute, fulfillmentType: product.fulfillment, leadTimeDays: product.leadTimeDays });
  const ProcessingIcon = processingInfo.kind === "ready_stock" ? PackageCheck : Clock;
  return <article className="catalog-product-card">
    <Link href={href} className="catalog-product-photo" aria-label={`Lihat detail ${product.name}`}>
      {product.mainImage && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.mainImage} alt={product.images?.[0]?.alt || product.name} loading="lazy" onError={() => setFailed(true)} />
      ) : <ProductImagePlaceholder name={product.name} category={product.category} accentColor={product.accentColor} className="h-full w-full" />}
      <span className="catalog-photo-badges">
        <span className={product.fulfillment === "READY_STOCK" ? "catalog-stock-ready" : "catalog-stock-order"}>{fulfillmentLabel(product.fulfillment)}</span>
        {validateProduct3DModel(product).ok && <span className="catalog-model-badge"><Box size={12} />3D tersedia</span>}
      </span>
    </Link>
    <div className="catalog-card-content">
      <div className="catalog-card-eyebrow"><span>{product.category}</span><span>{product.sku}</span></div>
      <h2><Link href={href}>{product.name}</Link></h2>
      <div className="catalog-industry-tags">{product.industries.slice(0,3).map(i=><span key={i}>{i}</span>)}{product.industries.length>3 && <span>+{product.industries.length-3}</span>}</div>
      <div className="catalog-card-specs"><span><Layers size={14}/>{product.moq<=1?'Min. beli':'MOQ'} <b>{Math.max(1,product.moq)} pcs</b></span><span><ProcessingIcon size={14}/>{processingInfo.label} <b>{processingInfo.value}</b></span></div>
      <div className="catalog-card-action"><p><strong>{formatIDR(product.priceFrom)}</strong> <span>/pcs</span></p><Link href={href} aria-label={`Lihat Detail ${product.name}`}>Lihat Detail <ArrowRight size={16}/></Link></div>
    </div>
  </article>;
}
