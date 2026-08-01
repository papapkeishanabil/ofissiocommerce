import "server-only";

import type { EmbroideryPricing } from "@/features/products/embroidery-pricing";
import { readGlobalEmbroideryPricing, writeGlobalEmbroideryPricing } from "./global-embroidery-pricing.repository";
import type { GlobalEmbroideryPricingPayload } from "./global-embroidery-pricing.validation";

export async function getGlobalEmbroideryPricing() {
  const state = await readGlobalEmbroideryPricing();
  const pricing: EmbroideryPricing = { enabled: state.schemaReady, mode: "flat_per_piece", zones: state.zones };
  return { ...state, pricing };
}

export async function getPublicGlobalEmbroideryPricing() {
  const state = await getGlobalEmbroideryPricing();
  return {
    zones: state.pricing.enabled
      ? state.pricing.zones.filter((zone) => zone.enabled).map((zone) => ({
          zoneId: zone.zoneId,
          label: zone.label,
          maxWidthCm: zone.maxWidthCm,
          maxHeightCm: zone.maxHeightCm,
          unitPrice: zone.unitPrice,
          ...(zone.showSetupFee && zone.setupFee > 0 ? { setupFee: zone.setupFee } : {}),
          ...(zone.notes?.trim() ? { notes: zone.notes.trim() } : {}),
        }))
      : [],
  };
}

export async function updateGlobalEmbroideryPricing(payload: GlobalEmbroideryPricingPayload) {
  return writeGlobalEmbroideryPricing(payload.zones);
}
