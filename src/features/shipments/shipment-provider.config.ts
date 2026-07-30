import type { ShipmentProvider } from "./shipment.types";

export const SHIPPING_PROVIDER_MODE =
  process.env.SHIPPING_PROVIDER?.trim() || "manual";

export const SHIPPING_PROVIDER_API_ENABLED =
  process.env.SHIPPING_PROVIDER_API_ENABLED === "true";

export function resolveTrackingUrl(input: {
  provider: ShipmentProvider;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
}) {
  const explicit = input.trackingUrl?.trim();
  if (explicit) return explicit;

  // Provider API / canonical tracking URL mapping is intentionally not guessed
  // in Phase 24. Admin can paste a verified URL manually.
  return null;
}

export function isManualShippingMode() {
  return !SHIPPING_PROVIDER_API_ENABLED || SHIPPING_PROVIDER_MODE === "manual";
}
