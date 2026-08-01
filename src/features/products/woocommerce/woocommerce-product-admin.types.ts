import type { ProductReadiness } from "./woocommerce-product-readiness";
import type {
  QuantityPricingBasis,
  QuantityPricingMode,
  QuantityPricingTier,
} from "../quantity-pricing";

export interface AdminWooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  price: number;
  status: string;
  categories: Array<{ id: number; name: string; slug: string }>;
  industries: string[];
  primaryImage: AdminProductImage | null;
  readiness: ProductReadiness;
  wooEditUrl: string | null;
}

export interface AdminWooCommerceProductDetail extends AdminWooCommerceProduct {
  description: string;
  shortDescription: string;
  imageCount: number;
  imageUrls: string[];
  images: AdminProductImage[];
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
    model3DUpdatedAt: string;
    moq: number;
    leadTime: string;
    fulfillmentType: string;
    transactionMode: string;
    supportsEmbroidery: boolean;
    supportsScreenPrinting: boolean;
    supportsDtf: boolean;
    embroideryZones: string[];
    hasLegacyEmbroideryPricing: boolean;
    alwaysOrderable: boolean;
    replenishmentPolicy: string;
    processRoute: string;
    gender: string;
    sleeveType: string;
    safetyFeatures: string[];
    quantityPricingEnabled: boolean;
    quantityPricingMode: QuantityPricingMode;
    quantityBasis: QuantityPricingBasis;
    quantityPricingTiers: QuantityPricingTier[];
  };
}

export interface AdminProductImage {
  id: number | null;
  src: string;
  name: string;
  alt: string;
}
