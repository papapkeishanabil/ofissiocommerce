import "server-only";
import { getDatabaseRuntimeConfig } from "@/features/database/database.config";
import { createApiError } from "@/lib/security/safe-error-response";

import { getBiteshipCourierCatalog } from "@/features/carrier-shipping/providers/biteship.provider";
import { getCarrierShippingConfig } from "@/features/carrier-shipping/carrier-shipping.config";

import { readShippingSettings, writeShippingSettings } from "./shipping-settings.repository";
import type { BiteshipCourierService } from "./shipping-settings.types";

export async function getShippingSettings() {
  return readShippingSettings();
}

export async function getShippingSettingsAdminState() {
  const [settings, catalog] = await Promise.all([readShippingSettings(), getBiteshipCourierCatalog()]);
  return { settings, catalog };
}

export async function getCourierPlanningOptions() {
  const enabledServices = await getCheckoutCourierSelection();
  const catalog = await getBiteshipCourierCatalog().catch(() => []);
  const enabledCatalog = catalog.filter((service) =>
    enabledServices.some(
      (key) => key === service.key || key === `${service.courierCode}:*`,
    ),
  );
  if (enabledCatalog.length > 0) return enabledCatalog;
  return enabledServices.map(fallbackPlanningService);
}

export async function updateShippingSettings(enabledServices: string[], actorId: string) {
  return writeShippingSettings(enabledServices, actorId);
}

export async function getCheckoutCourierSelection(options: { requireVerified?: boolean } = {}) {
  const settings = await readShippingSettings();
  if (options.requireVerified && (!settings.schemaReady || settings.source === "fallback" ||
    ((process.env.NODE_ENV === "production" || getDatabaseRuntimeConfig().requestedProvider !== "mock") && settings.source !== "supabase")))
    throw createApiError("PROVIDER_UNAVAILABLE", "Pilihan kurir belum dapat diperiksa dari sistem.", 503);
  // A persisted row is authoritative, including an intentionally empty selection.
  if (settings.schemaReady && settings.updatedAt) return settings.enabledServices;
  const legacy = getCarrierShippingConfig().biteship.courierFilter;
  const fallbackCouriers = legacy.length > 0
    ? legacy
    : ["jne", "sicepat", "jnt", "anteraja"];
  return fallbackCouriers.map((courier) => `${courier.toLowerCase()}:*`);
}

const COURIER_NAMES: Record<string, string> = {
  jne: "JNE",
  jnt: "J&T Express",
  sicepat: "SiCepat",
  anteraja: "AnterAja",
  ninja: "Ninja Xpress",
  lion: "Lion Parcel",
  paxel: "Paxel",
};

function fallbackPlanningService(key: string): BiteshipCourierService {
  const [rawCourier, rawService] = key.toLowerCase().split(":");
  const courierCode = rawCourier || "courier";
  const wildcard = !rawService || rawService === "*";
  const serviceCode = wildcard ? "standard" : rawService;
  return {
    key: `${courierCode}:${serviceCode}`,
    courierCode,
    courierName: COURIER_NAMES[courierCode] ?? courierCode.toUpperCase(),
    serviceCode,
    serviceName: wildcard ? "Layanan standar" : serviceCode.toUpperCase(),
    serviceType: null,
    shippingType: null,
    description: wildcard ? "Pilihan sementara dari konfigurasi kurir aktif" : null,
  };
}
