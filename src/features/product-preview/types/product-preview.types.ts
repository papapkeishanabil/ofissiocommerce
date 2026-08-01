import type { OfissioProduct } from "@/features/products/product.types";

export interface FloatingProductPreviewData {
  product: OfissioProduct;
  color: string;
  totalQty: number;
  embroideryCount: number;
  snapshotUrl?: string;
}
