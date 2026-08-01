/* eslint-disable @next/next/no-img-element */
import { ProductImagePlaceholder } from "@/components/catalog/ProductImagePlaceholder";
import type { FloatingProductPreviewData } from "../types/product-preview.types";

interface ProductPreviewVisualProps {
  data: FloatingProductPreviewData;
  className?: string;
}

export function ProductPreviewVisual({ data, className }: ProductPreviewVisualProps) {
  if (data.snapshotUrl) {
    // Snapshot is produced locally by Phase 4A and is safe to render as-is.
    return <img src={data.snapshotUrl} alt="Preview konfigurasi produk" className={className} />;
  }

  if (data.product.mainImage) {
    // Dynamic WooCommerce/Supabase image host.
    return (
      <img
        src={data.product.mainImage}
        alt={data.product.images?.[0]?.alt || data.product.name}
        className={`${className ?? ""} object-contain`}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <ProductImagePlaceholder
      name={data.product.name}
      accentColor={data.product.accentColor}
      category={data.product.category}
      className={className}
    />
  );
}
