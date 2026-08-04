import "server-only";

import { getCarrierShippingConfig } from "../carrier-shipping.config";
import type {
  ProviderCreateShipmentResult,
  ProviderRateResult,
} from "../carrier-shipping.types";
import type { CarrierShippingProviderAdapter } from "./carrier-shipping.provider";
import { createApiError, logInternalError } from "@/lib/security/safe-error-response";

type JsonObject = Record<string, unknown>;

export const biteshipCarrierShippingProvider: CarrierShippingProviderAdapter = {
  async getRates(request) {
    const config = requireBiteshipConfig();
    const couriers =
      request.courierFilter?.length || config.biteship.courierFilter.length
        ? (request.courierFilter?.length
            ? request.courierFilter
            : config.biteship.courierFilter
          ).join(",")
        : "jne,sicepat,jnt,anteraja";
    const payload = {
      origin_postal_code: Number(request.origin.postalCode),
      destination_postal_code: Number(request.destination.postalCode),
      couriers,
      items: request.items.map((item) => ({
        name: item.name,
        description: item.description,
        category: item.category,
        value: item.value,
        quantity: item.quantity,
        weight: item.weightGram,
        height: item.heightCm,
        length: item.lengthCm,
        width: item.widthCm,
      })),
    };
    const response = await biteshipFetch("/v1/rates/couriers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const pricing = Array.isArray(response.pricing) ? response.pricing : [];
    return pricing.map(mapRate).filter((rate): rate is ProviderRateResult => Boolean(rate));
  },

  async createShipment({ referenceId, quote }) {
    requireBiteshipConfig();
    const payload = {
      shipper_contact_name: quote.originSnapshot.contactName,
      shipper_contact_phone: quote.originSnapshot.contactPhone,
      shipper_contact_email: "",
      shipper_organization: "Ofissio",
      origin_contact_name: quote.originSnapshot.contactName,
      origin_contact_phone: quote.originSnapshot.contactPhone,
      origin_address: quote.originSnapshot.address,
      origin_postal_code: Number(quote.originSnapshot.postalCode),
      destination_contact_name: quote.destinationSnapshot.contactName,
      destination_contact_phone: quote.destinationSnapshot.contactPhone,
      destination_address: quote.destinationSnapshot.address,
      destination_postal_code: Number(quote.destinationSnapshot.postalCode),
      courier_company: quote.courierCompany,
      courier_type: quote.courierType,
      delivery_type: "now",
      reference_id: referenceId,
      items: quote.packageSnapshot.map((item) => ({
        name: item.name,
        description: item.description,
        category: item.category,
        value: item.value,
        quantity: item.quantity,
        weight: item.weightGram,
        height: item.heightCm,
        length: item.lengthCm,
        width: item.widthCm,
      })),
    };
    const response = await biteshipFetch("/v1/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return mapShipment(response, quote.shippingPrice);
  },

  async retrieveShipment(providerShipmentId) {
    const response = await biteshipFetch(
      `/v1/orders/${encodeURIComponent(providerShipmentId)}`,
      { method: "GET" },
    );
    return mapShipment(response, 0);
  },
};

function requireBiteshipConfig() {
  const config = getCarrierShippingConfig();
  if (!config.biteship.isConfigured || config.provider !== "biteship") {
    throw createApiError(
      "PROVIDER_UNAVAILABLE",
      "Konfigurasi Biteship belum lengkap.",
      503,
    );
  }
  if (config.biteship.mode === "live" && config.mode !== "live") {
    throw createApiError("PROVIDER_UNAVAILABLE", "Mode Biteship tidak konsisten.", 503);
  }
  return config;
}

async function biteshipFetch(path: string, init: RequestInit): Promise<JsonObject> {
  const config = requireBiteshipConfig();
  let response: Response;
  try {
    response = await fetch(`${config.biteship.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: config.biteship.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    logInternalError(error, { area: "biteship", operation: init.method, path });
    throw createApiError("PROVIDER_UNAVAILABLE", "Biteship belum dapat dihubungi.", 503);
  }
  const body = (await response.json().catch(() => ({}))) as JsonObject;
  if (!response.ok || body.success === false) {
    logInternalError(new Error("Biteship request failed."), {
      area: "biteship",
      operation: init.method,
      path,
      status: response.status,
      code: typeof body.code === "number" || typeof body.code === "string" ? body.code : undefined,
    });
    throw createApiError("PROVIDER_UNAVAILABLE", "Biteship belum dapat memproses pengiriman.", 503);
  }
  return body;
}

function mapRate(value: unknown): ProviderRateResult | null {
  if (!value || typeof value !== "object") return null;
  const row = value as JsonObject;
  const company = stringValue(row.company ?? row.courier_company);
  const type = stringValue(row.type ?? row.courier_type);
  const price = numberValue(row.price);
  if (!company || !type || !Number.isFinite(price) || price < 0) return null;
  return {
    providerQuoteId: stringValue(row.id) || `${company}:${type}:${price}`,
    courierCompany: company,
    courierType: type,
    courierService: stringValue(row.courier_name ?? row.service_name) || `${company.toUpperCase()} ${type.toUpperCase()}`,
    price,
    duration: stringValue(row.duration) || null,
    safeSnapshot: {
      company,
      type,
      service: stringValue(row.courier_name ?? row.service_name) || null,
      duration: stringValue(row.duration) || null,
      price,
    },
  };
}

function mapShipment(row: JsonObject, fallbackPrice: number): ProviderCreateShipmentResult {
  const courier = objectValue(row.courier);
  const id = stringValue(row.id);
  if (!id) throw createApiError("PROVIDER_UNAVAILABLE", "Respons shipment Biteship tidak valid.", 503);
  return {
    providerShipmentId: id,
    waybillId: stringValue(courier.waybill_id ?? row.courier_waybill_id) || null,
    status: stringValue(row.status) || "confirmed",
    trackingUrl: stringValue(courier.link ?? row.courier_link) || null,
    price: numberValue(row.price ?? row.order_price) || fallbackPrice,
    safeSnapshot: {
      id,
      status: stringValue(row.status) || null,
      courierTrackingId: stringValue(courier.tracking_id ?? row.courier_tracking_id) || null,
      waybillAvailable: Boolean(courier.waybill_id ?? row.courier_waybill_id),
    },
  };
}

function objectValue(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
