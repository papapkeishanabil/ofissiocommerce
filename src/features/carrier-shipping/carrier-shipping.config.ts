import "server-only";

import type {
  CarrierShippingMode,
  CarrierShippingProvider,
  ShippingAddressSnapshot,
} from "./carrier-shipping.types";

function env(name: string, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

function boolEnv(name: string, fallback = false) {
  const value = process.env[name]?.trim().toLowerCase();
  return value ? value === "true" : fallback;
}

function positiveInt(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function getCarrierShippingConfig() {
  const requestedProvider = env("SHIPPING_PROVIDER", "mock").toLowerCase();
  const requestedMode = env("SHIPPING_MODE", "sandbox").toLowerCase();
  const biteshipMode = env("BITESHIP_MODE", requestedMode).toLowerCase();
  const provider: CarrierShippingProvider =
    requestedProvider === "biteship" ? "biteship" : "mock";
  const mode: CarrierShippingMode = requestedMode === "live" ? "live" : "sandbox";
  const appEnvironment = env(
    "APP_ENV",
    process.env.NODE_ENV === "production" ? "production" : "development",
  ).toLowerCase();
  const mockAllowed =
    appEnvironment !== "production" || boolEnv("SHIPPING_ALLOW_MOCK_IN_PRODUCTION");

  return {
    requestedProvider,
    provider,
    mode,
    isRuntimeAllowed: provider === "biteship" || mockAllowed,
    biteship: {
      enabled: boolEnv("BITESHIP_ENABLED"),
      mode: biteshipMode === "live" ? ("live" as const) : ("sandbox" as const),
      baseUrl: env("BITESHIP_BASE_URL", "https://api.biteship.com").replace(/\/+$/, ""),
      apiKey: env("BITESHIP_API_KEY"),
      webhookSecret: env("BITESHIP_WEBHOOK_SECRET"),
      webhookUrl: env("BITESHIP_WEBHOOK_URL"),
      testCreateShipment: boolEnv("BITESHIP_TEST_CREATE_SHIPMENT"),
      courierFilter: env("BITESHIP_COURIERS")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
      isConfigured:
        boolEnv("BITESHIP_ENABLED") &&
        Boolean(env("BITESHIP_API_KEY")) &&
        Boolean(env("BITESHIP_ORIGIN_CONTACT_PHONE")) &&
        Boolean(env("BITESHIP_ORIGIN_ADDRESS")) &&
        Boolean(env("BITESHIP_ORIGIN_POSTAL_CODE")),
    },
    origin: {
      contactName: env("BITESHIP_ORIGIN_CONTACT_NAME", "Ofissio Fulfillment"),
      contactPhone: env("BITESHIP_ORIGIN_CONTACT_PHONE"),
      address: env("BITESHIP_ORIGIN_ADDRESS"),
      city: env("DEFAULT_ORIGIN_CITY", "Bandung"),
      province: null,
      postalCode: env("BITESHIP_ORIGIN_POSTAL_CODE", env("DEFAULT_ORIGIN_POSTAL_CODE")),
      areaId: env("BITESHIP_ORIGIN_AREA_ID") || null,
    } satisfies ShippingAddressSnapshot,
    packageDefaults: {
      weightGram: positiveInt("BITESHIP_DEFAULT_ITEM_WEIGHT_GRAM", 500),
      lengthCm: positiveInt("BITESHIP_DEFAULT_ITEM_LENGTH_CM", 30),
      widthCm: positiveInt("BITESHIP_DEFAULT_ITEM_WIDTH_CM", 25),
      heightCm: positiveInt("BITESHIP_DEFAULT_ITEM_HEIGHT_CM", 5),
    },
  };
}
