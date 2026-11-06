import type { EmbroideryPlacement } from "@/types/uniform-3d";

export function requiresEmbroideryConfirmation(items: readonly {model3dId?: string | null; embroideryPlacements: readonly EmbroideryPlacement[]}[]) {
  return items.some(item => item.embroideryPlacements.length > 0 && (!item.model3dId || item.embroideryPlacements.some(placement => placement.sizingMode === "ofissio")));
}

export function hasUnpricedEmbroidery(items: readonly {missingEmbroideryPricingZones?: readonly unknown[]}[]) {
  return items.some(item => (item.missingEmbroideryPricingZones?.length ?? 0) > 0);
}
