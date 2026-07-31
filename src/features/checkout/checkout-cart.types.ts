import type { SizeMatrix } from "@/types/industry";
import type { LogoPlacement } from "@/types/uniform-3d";
import type {
  QuantityPricingBasis,
  QuantityPricingMode,
} from "@/features/products/quantity-pricing";

export interface CheckoutCartItemInput {
  productId: string;
  selectedColor: string;
  sizeMatrix: SizeMatrix;
  customization: string | null;
  embroideryPlacements: LogoPlacement[];
}

export interface SyncCheckoutCartInput {
  companyId: string;
  userId: string;
  items: CheckoutCartItemInput[];
}

export interface ValidatedCheckoutCartItem {
  productId: string;
  source: "mock" | "woocommerce";
  sourceId: string;
  productSlug: string;
  productName: string;
  sku: string;
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
  moq: number;
  fulfillmentType: string;
  transactionMode: string;
  model3dId: string;
  model3dUrl: string;
  customization: string | null;
  embroideryPlacements: LogoPlacement[];
}

export interface CheckoutCartRecord {
  id: string;
  companyId: string;
  userId: string;
  items: ValidatedCheckoutCartItem[];
  subtotal: number;
  totalQty: number;
  createdAt: string;
  expiresAt: string;
}
