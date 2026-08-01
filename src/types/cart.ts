// src/types/cart.ts
import type { SizeMatrix } from "./industry";
import type { Uniform3DConfig } from "./uniform-3d";
import type {
  QuantityPricing,
  QuantityPricingBasis,
  QuantityPricingMode,
} from "@/features/products/quantity-pricing";
import type {
  EmbroideryPricing,
  EmbroideryPricingLine,
  EmbroideryPricingZoneId,
} from "@/features/products/embroidery-pricing";

export interface CartLineItem {
  /** stable id derived from productId + color (one line per product+color) */
  id: string;
  productId: string;
  source?: "mock" | "woocommerce";
  sourceId?: string;
  productSlug: string;
  productName: string;
  sku: string;
  /** immutable purchasing snapshot from the canonical product service */
  priceFrom?: number;
  moq?: number;
  fulfillmentType?: string;
  transactionMode?: string;
  model3dId?: string;
  model3dUrl?: string;
  color: string;
  /** quantity per size */
  sizes: SizeMatrix;
  totalQty: number;
  /** unit price snapshot (IDR) — derived from product priceFrom */
  unitPrice: number;
  /** estimated price = unitPrice * totalQty */
  estimatedPrice: number;
  regularPrice: number;
  finalUnitPrice: number;
  quantityTierLabel: string | null;
  quantityPricingBasis: QuantityPricingBasis;
  quantityPricingMode: QuantityPricingMode;
  quantityTierApplied: boolean;
  subtotal: number;
  productSubtotal: number;
  /** Canonical tier snapshot used when quantity is edited in the client cart. */
  quantityPricing?: QuantityPricing;
  selectedEmbroideryZones: EmbroideryPricingZoneId[];
  embroideryPricingSnapshot?: EmbroideryPricing;
  productSupportedEmbroideryZones?: EmbroideryPricingZoneId[];
  embroideryLines: EmbroideryPricingLine[];
  embroideryTotal: number;
  missingEmbroideryPricingZones: EmbroideryPricingZoneId[];
  customizationTotal: number;
  finalEstimatedTotal: number;
  /** placeholder for future customization (logo/bordir) */
  customization: string | null;
  /** full 3D embroidery config — present when customer used the 3D tab */
  uniform3DConfig?: Uniform3DConfig | null;
  embroideryPlacements?: Uniform3DConfig["placements"];
}

export function emptySizeMatrix(): SizeMatrix {
  return { S: 0, M: 0, L: 0, XL: 0, "2XL": 0, "3XL": 0 };
}

export function sumSizeMatrix(m: SizeMatrix): number {
  return Object.values(m).reduce((acc, n) => acc + (n || 0), 0);
}

export function lineItemId(productId: string, color: string): string {
  return `${productId}__${color.toLowerCase()}`;
}
