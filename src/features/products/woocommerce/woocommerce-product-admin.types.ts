import type { ProductReadiness } from "./woocommerce-product-readiness";

export interface AdminWooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  price: number;
  status: string;
  categories: Array<{ id: number; name: string; slug: string }>;
  industries: string[];
  readiness: ProductReadiness;
  wooEditUrl: string | null;
}

export interface AdminWooCommerceProductDetail extends AdminWooCommerceProduct {
  description: string;
  shortDescription: string;
  imageCount: number;
  attributes: Array<{ name: string; slug: string; options: string[] }>;
  ofissioMeta: {
    has3DModel: boolean;
    model3DUrl: string;
    model3DStorageBucket: string;
    model3DStorageKey: string;
    model3DId: string;
    model3DVersion: string;
    model3DSource: string;
    model3DFilename: string;
    moq: number;
    leadTime: string;
    fulfillmentType: string;
    transactionMode: string;
    supportsEmbroidery: boolean;
    embroideryZones: string[];
  };
}
