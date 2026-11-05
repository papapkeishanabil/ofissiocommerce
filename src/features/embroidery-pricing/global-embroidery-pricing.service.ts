import "server-only";
import { getDatabaseRuntimeConfig } from "@/features/database/database.config";
import { createApiError } from "@/lib/security/safe-error-response";

import type { EmbroideryPricing } from "@/features/products/embroidery-pricing";
import { readGlobalEmbroideryPricing, writeGlobalEmbroideryPricing } from "./global-embroidery-pricing.repository";
import type { GlobalEmbroideryPricingPayload } from "./global-embroidery-pricing.validation";

export async function getGlobalEmbroideryPricing() {
  const state = await readGlobalEmbroideryPricing();
  const pricing: EmbroideryPricing = { enabled: state.schemaReady, mode: "flat_per_piece", zones: state.zones };
  return { ...state, pricing };
}

export function assertVerifiedEmbroideryState(state: { source: string; schemaReady: boolean }) {
  const database = getDatabaseRuntimeConfig();
  if (!state.schemaReady || state.source === "fallback" ||
      (database.requestedProvider !== "mock" && state.source !== "supabase") ||
      (process.env.NODE_ENV === "production" && state.source !== "supabase"))
    throw createApiError("PROVIDER_UNAVAILABLE", "Tarif bordir belum dapat diperiksa dari sistem.", 503);
}

export async function getPublicGlobalEmbroideryPricing(options: { requireVerified?: boolean } = {}) {
  const state = await getGlobalEmbroideryPricing();
  if (options.requireVerified) assertVerifiedEmbroideryState(state);
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
