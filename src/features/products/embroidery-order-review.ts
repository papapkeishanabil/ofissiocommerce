import type { EmbroideryPlacement, Uniform3DConfig } from "@/types/uniform-3d";

type ReviewItem = {
  embroideryPlacements?: EmbroideryPlacement[];
  uniform3DConfig?: Pick<Uniform3DConfig, "placements"> | null;
  missingEmbroideryPricingZones?: readonly unknown[];
  selectedEmbroideryZones?: readonly unknown[];
  embroideryLines?: readonly unknown[];
  embroideryTotal?: number;
  customization?: string | null;
  transactionMode?: string;
};

/** Preserve old 3D cart configurations when building a review or server payload. */
export function cartEmbroideryPlacements(item: ReviewItem): EmbroideryPlacement[] {
  return item.embroideryPlacements ?? item.uniform3DConfig?.placements ?? [];
}

/** Commercial confirmation is independent of the production artwork approval. */
export function needsEmbroideryOrderConfirmation(items: readonly ReviewItem[]) {
  return items.some(item => {
    if (item.transactionMode === "REQUEST_QUOTATION" || item.missingEmbroideryPricingZones?.length) return true;
    const placements = cartEmbroideryPlacements(item);
    if (placements.some(placement => placement.sizingMode === "ofissio")) return true;
    const hasUnspecifiedCustomization = Boolean(item.customization?.trim()) || Boolean(item.selectedEmbroideryZones?.length) || Boolean(item.embroideryLines?.length) || (item.embroideryTotal ?? 0) > 0;
    return !placements.length && hasUnspecifiedCustomization;
  });
}
