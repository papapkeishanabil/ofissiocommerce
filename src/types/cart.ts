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
import type { ProductProcessRoute } from "@/features/products/product.types";

export interface CartLineItem {
  /** stable id derived from productId + color (one line per product+color) */
  id: string;
  productId: string;
  source?: "mock" | "woocommerce";
  sourceId?: string;
  productSlug: string;
  productName: string;
  sku: string;
  variationId?: number;
  parentSku?: string;
  /** catalog main image snapshot (index 0 of the product images) */
  image?: string | null;
  /** immutable purchasing snapshot from the canonical product service */
  priceFrom?: number;
  moq?: number;
  fulfillmentType?: string;
  processRoute?: ProductProcessRoute;
  leadTimeDays?: number;
  transactionMode?: string;
  model3dId?: string;
  model3dUrl?: string;
  canAddEmbroidery?: boolean;
  color: string;
  selectedSleeve?: string;
  selectedOptions?: Record<string, string>;
  availableSizes?: string[];
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
  return { OS: 0, XS: 0, S: 0, M: 0, L: 0, XL: 0, "2XL": 0, "3XL": 0, "4XL": 0, "5XL": 0 };
}

export function sumSizeMatrix(m: SizeMatrix): number {
  return Object.values(m).reduce((acc, n) => acc + (n || 0), 0);
}

/**
 * Pembagian MOQ merata ke M/L/XL yang jumlahnya TEPAT `moq` — dipakai quick-add
 * katalog & Ofistant. (Spread lama `max(1, floor(moq/3))` menghasilkan 2 pcs
 * saat moq 1.) moq < 3 → semua ke M agar tidak menyebar 1-1-0.
 */
export function moqSizeSpread(moq: number): SizeMatrix {
  const sizes = emptySizeMatrix();
  const total = Math.max(0, Math.trunc(moq));
  if (total < 3) {
    sizes.M = total;
    return sizes;
  }
  const perSize = Math.floor(total / 3);
  sizes.M = perSize;
  sizes.L = perSize;
  sizes.XL = total - perSize * 2;
  return sizes;
}

export function lineItemId(productId: string, color: string): string {
  return `${productId}__${color.toLowerCase()}`;
}

/** One canonical check for every cart representation of embroidery/custom work. */
export function hasCartCustomization(item: CartLineItem): boolean {
  return (
    (item.uniform3DConfig?.placements.length ?? 0) > 0 ||
    (item.embroideryPlacements?.length ?? 0) > 0 ||
    (item.selectedEmbroideryZones?.length ?? 0) > 0 ||
    (item.embroideryLines?.length ?? 0) > 0 ||
    (item.embroideryTotal ?? 0) > 0 ||
    Boolean(item.customization?.trim())
  );
}
