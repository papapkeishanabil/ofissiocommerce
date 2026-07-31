import type { Product } from "@/types/product";
import type { EmbroideryZone, CameraPreset } from "@/types/uniform-3d";
import type {
  ProductAttributeValue,
  ProductTaxonomyReference,
} from "@/features/catalog-taxonomy/catalog-taxonomy.types";
import type { QuantityPricing } from "./quantity-pricing";
import type { EmbroideryPricing } from "./embroidery-pricing";

export type ProductStatus = "draft" | "published" | "archived";
export type TransactionMode = "DIRECT_CHECKOUT" | "REQUEST_QUOTATION" | "HYBRID";
export type ProductModelSource =
  | "tripo3d"
  | "blender"
  | "manual"
  | "supabase"
  | "woocommerce"
  | "other";

export interface Product3DModel {
  id: string; url: string; filename: string; version: string;
  source: ProductModelSource; file_type: "glb"; uploaded_at: string; is_required: true;
}

/** Canonical product contract. UI-compatible fields remain from Product. */
export interface OfissioProduct extends Product {
  source: "mock" | "woocommerce"; source_id: string; short_description: string;
  subcategory: string; lead_time: string; transaction_mode: TransactionMode;
  available_sizes: string[]; available_colors: string[]; gender: "men" | "women" | "unisex";
  sleeve_type: "short" | "long"; usage: "indoor" | "outdoor" | "both";
  safety_features: string[]; supports_embroidery: boolean; supports_screen_printing: boolean;
  supports_dtf: boolean; embroidery_zones: EmbroideryZone[]; has_3d_model: boolean;
  model_3d: Product3DModel | null; model_3d_url: string | null; model_3d_id: string | null; model_3d_version: string | null;
  camera_presets: CameraPreset[]; status: ProductStatus;
  /** Full WooCommerce taxonomy. Legacy category/industries remain for existing UI. */
  categories?: ProductTaxonomyReference[];
  categorySlugs?: string[];
  industrySlugs?: string[];
  tags?: ProductTaxonomyReference[];
  attributes?: ProductAttributeValue[];
  searchableTerms?: string[];
  /** Optional for legacy mock products; WooCommerce products always map this field. */
  quantityPricing?: QuantityPricing;
  /** Optional for legacy mock products; WooCommerce products map pricing from product meta. */
  embroideryPricing?: EmbroideryPricing;
}
