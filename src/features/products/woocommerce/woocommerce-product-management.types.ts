export const WOO_PRODUCT_STATUSES = ["draft", "publish"] as const;
export const WOO_FULFILLMENT_TYPES = [
  "ready_stock",
  "ready_stock_with_customization",
  "made_to_order",
  "quotation_only",
] as const;
export const WOO_TRANSACTION_MODES = ["direct_checkout", "quotation", "hybrid"] as const;
export const WOO_REPLENISHMENT_POLICIES = ["internal_warning_only", "block_order_future"] as const;
export const WOO_PROCESS_ROUTES = ["fulfillment", "customization", "production"] as const;
export const WOO_GENDERS = ["men", "women", "unisex"] as const;
export const WOO_SLEEVE_TYPES = ["short", "long"] as const;
export const WOO_EMBROIDERY_ZONES = [
  "left_chest",
  "right_chest",
  "left_sleeve",
  "right_sleeve",
  "upper_back",
  "center_back",
] as const;
export const WOO_QUANTITY_PRICING_MODES = ["fixed_unit_price"] as const;
export const WOO_QUANTITY_BASES = ["total_order_qty"] as const;
export const WOO_EMBROIDERY_PRICING_MODES = ["flat_per_piece"] as const;

export interface AdminQuantityPricingTierInput {
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
  label: string;
}

export interface AdminWooProductInput {
  name: string;
  slug?: string;
  sku: string;
  regularPrice: number;
  status: (typeof WOO_PRODUCT_STATUSES)[number];
  description: string;
  shortDescription: string;
  categoryIds: number[];
  industries: string[];
  imageUrls: string[];
  colors: string[];
  sizes: string[];
  materials: string[];
  gender: (typeof WOO_GENDERS)[number];
  sleeveType: (typeof WOO_SLEEVE_TYPES)[number];
  safetyFeatures: string[];
  moq: number;
  leadTimeDays: number;
  fulfillmentType: (typeof WOO_FULFILLMENT_TYPES)[number];
  transactionMode: (typeof WOO_TRANSACTION_MODES)[number];
  alwaysOrderable: boolean;
  replenishmentPolicy: (typeof WOO_REPLENISHMENT_POLICIES)[number];
  processRoute: (typeof WOO_PROCESS_ROUTES)[number];
  supportsEmbroidery: boolean;
  supportsScreenPrinting: boolean;
  supportsDtf: boolean;
  embroideryZones: string[];
  embroideryPricingEnabled: boolean;
  embroideryPricingMode: (typeof WOO_EMBROIDERY_PRICING_MODES)[number];
  embroideryPricingZones: EmbroideryPricingZone[];
  quantityPricingEnabled: boolean;
  quantityPricingMode: (typeof WOO_QUANTITY_PRICING_MODES)[number];
  quantityBasis: (typeof WOO_QUANTITY_BASES)[number];
  quantityPricingTiers: AdminQuantityPricingTierInput[];
}

export interface ProductGlbUploadResult {
  filename: string;
  version: string;
  modelId: string;
  sizeBytes: number;
  uploadedAt: string;
}
import type { EmbroideryPricingZone } from "../embroidery-pricing";
