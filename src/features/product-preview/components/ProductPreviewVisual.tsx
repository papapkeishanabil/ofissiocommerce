import { ProductImagePlaceholder } from "@/components/catalog/ProductImagePlaceholder";
import type { FloatingProductPreviewData } from "../types/product-preview.types";

interface ProductPreviewVisualProps {
  data: FloatingProductPreviewData;
  className?: string;
}

export function ProductPreviewVisual({ data, className }: ProductPreviewVisualProps) {
  if (data.snapshotUrl) {
    // Snapshot is produced locally by Phase 4A and is safe to render as-is.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={data.snapshotUrl} alt="Preview konfigurasi produk" className={className} />;
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
