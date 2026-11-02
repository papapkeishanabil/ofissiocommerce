import type { Product } from "@/types/product";
import type { EmbroideryZone, CameraPreset, ModelOrientationY } from "@/types/uniform-3d";
import type {
  ProductAttributeValue,
  ProductTaxonomyReference,
} from "@/features/catalog-taxonomy/catalog-taxonomy.types";
import type { QuantityPricing } from "./quantity-pricing";
import type { EmbroideryPricing } from "./embroidery-pricing";
import type { ModelColorAdjustment } from "@/types/model-color-adjustment";
import type { ProductColorVariant } from "./color-variants";

export type ProductStatus = "draft" | "published" | "archived";
export type TransactionMode = "DIRECT_CHECKOUT" | "REQUEST_QUOTATION" | "HYBRID";
/** Rute pengerjaan Woo (meta process_route): STK / CUS / PRO. */
export type ProductProcessRoute = "fulfillment" | "customization" | "production";
export type ProductModelSource =
  | "tripo3d"
  | "blender"
  | "manual"
  | "supabase"
  | "woocommerce"
  | "other";

export interface Product3DModel extends Partial<ModelColorAdjustment> {
  id: string; url: string; filename: string; version: string;
  source: ProductModelSource; file_type: "glb"; uploaded_at: string; is_required: true;
  /** Rotasi koreksi sumbu Y agar preset kamera sesuai sisi pakaian. */
  orientationY?: ModelOrientationY;
}

export interface ProductImageReference {
  id: number | null;
  src: string;
  name: string;
  alt: string;
}

/** Canonical product contract. UI-compatible fields remain from Product. */
export interface OfissioProduct extends Product {
  /** Uniform live native price, checked against storefront pricing before schema output. */
  liveOfferPrice?: number;
  liveOfferAvailability?: "InStock" | "OutOfStock" | "BackOrder";
  liveVariantAvailability?: Record<string, "InStock" | "OutOfStock" | "BackOrder">;
  sizeChartId?: string;
  sleeveSizeChartIds?: import("../size-charts/sleeve-size-chart-settings").SleeveSizeChartIds;
  stockVariantsReady?: boolean;
  productKind?: "simple" | "variable";
  modelCode?: string;
  variantOptions?: import("./product-variants").VariantOption[];
  productVariants?: import("./product-variants").ProductVariant[];
  defaultVariantSku?: string;
  purchaseVariants?: import("./purchase-variants").PurchaseVariant[];
  colorSizeVariantsEnabled?: boolean;
  colorSizeVariants?: import("./color-size-variants").ColorSizeVariant[];
  colorVariants?: ProductColorVariant[];
  colorVariantsEnabled?: boolean;
  colorVariantsReady?: boolean;
  defaultColor?: string;
  source: "mock" | "woocommerce"; source_id: string; short_description: string;
  /**
   * HTML deskripsi tersanitasi untuk render storefront (dangerouslySetInnerHTML
   * + class .rich-text). Dilampirkan hanya di jalur server (repository); produk
   * mock/legacy tanpa field ini memakai fallback teks polos `description`.
   */
  descriptionHtml?: string;
  subcategory: string; lead_time: string; transaction_mode: TransactionMode;
  colorValues?: Record<string, string>;
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
  /** Deprecated WooCommerce metadata retained for migration visibility only. */
  legacyEmbroideryPricing?: EmbroideryPricing;
  /** Canonical shipping measurements managed from Admin Ofissio. */
  shippingWeightGram?: number;
  shippingLengthCm?: number;
  shippingWidthCm?: number;
  shippingHeightCm?: number;
  /** WooCommerce image order: index 0 is the catalog/main image. */
  mainImage?: string | null;
  images?: ProductImageReference[];
  /** Rute pengerjaan dari meta Woo process_route; optional untuk mock lama. */
  processRoute?: ProductProcessRoute;
}
