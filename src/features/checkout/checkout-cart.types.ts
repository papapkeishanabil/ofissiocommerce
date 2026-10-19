import type { SizeMatrix } from "@/types/industry";
import type { LogoPlacement } from "@/types/uniform-3d";
import type {
  QuantityPricingBasis,
  QuantityPricingMode,
} from "@/features/products/quantity-pricing";
import type {
  EmbroideryPricing,
  EmbroideryPricingLine,
  EmbroideryPricingZoneId,
} from "@/features/products/embroidery-pricing";

export interface CheckoutCartItemInput {
  productId: string;
  selectedColor: string;
  sizeMatrix: SizeMatrix;
  customization: string | null;
  embroideryPlacements: LogoPlacement[];
}

export interface SyncCheckoutCartInput {
  orderNote?: string;
  companyId: string;
  userId: string;
  promotionCode?: string | null;
  items: CheckoutCartItemInput[];
}

export interface ValidatedCheckoutCartItem {
  productId: string;
  /** `custom` is an internal quotation line, not a catalog product. */
  source: "mock" | "woocommerce" | "custom";
  sourceId: string;
  productSlug: string;
  productName: string;
  sku: string;
  variationId?: number;
  parentSku?: string;
  /** catalog main image snapshot — rides inside order_json, no schema column */
  image?: string | null;
  selectedColor: string;
  sizeMatrix: SizeMatrix;
  totalQty: number;
  priceFrom: number;
  regularPrice: number;
  finalUnitPrice: number;
  quantityTierLabel: string | null;
  quantityPricingBasis: QuantityPricingBasis;
  quantityPricingMode: QuantityPricingMode;
  quantityTierApplied: boolean;
  subtotal: number;
  productSubtotal: number;
  selectedEmbroideryZones: EmbroideryPricingZoneId[];
  embroideryPricingSnapshot: EmbroideryPricing;
  embroideryLines: EmbroideryPricingLine[];
  embroideryTotal: number;
  missingEmbroideryPricingZones: EmbroideryPricingZoneId[];
  customizationTotal: number;
  finalEstimatedTotal: number;
  moq: number;
  fulfillmentType: string;
  transactionMode: string;
  model3dId: string;
  model3dUrl: string;
  customization: string | null;
  embroideryPlacements: LogoPlacement[];
}

export interface CheckoutCartRecord {
  orderNote?: string;
  id: string;
  companyId: string;
  userId: string;
  items: ValidatedCheckoutCartItem[];
  subtotal: number;
  promotionCode: string | null;
  discountTotal: number;
  netSubtotal: number;
  totalQty: number;
  createdAt: string;
  expiresAt: string;
}
