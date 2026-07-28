import type { Product } from "@/types/product";

export interface FloatingProductPreviewData {
  product: Product;
  color: string;
  totalQty: number;
  embroideryCount: number;
  snapshotUrl?: string;
}
