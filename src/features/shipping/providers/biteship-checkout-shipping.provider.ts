import "server-only";

import { getCarrierShippingConfig } from "@/features/carrier-shipping/carrier-shipping.config";
import { biteshipCarrierShippingProvider } from "@/features/carrier-shipping/providers/biteship.provider";
import { productServerService } from "@/features/products/product.server-service";
import { createApiError } from "@/lib/security/safe-error-response";
import { getCheckoutCourierSelection } from "@/features/shipping-settings/shipping-settings.service";

import type { ShippingProviderAdapter, ShippingRate } from "../shipping.types";

export const biteshipCheckoutShippingProvider: ShippingProviderAdapter = {
  name: "biteship",
  async getRates({ request }) {
    const config = getCarrierShippingConfig();
    if (config.provider !== "biteship" || !config.biteship.isConfigured) {
      throw createApiError(
        "PROVIDER_UNAVAILABLE",
        "Konfigurasi Biteship belum lengkap.",
        503,
      );
    }

    const items = await Promise.all(
      request.items.map(async (item) => {
        const product = await productServerService.getProductById(item.productId);
        if (!product) {
          throw createApiError("NOT_FOUND", "Produk pengiriman tidak ditemukan.", 404);
        }
        const validation = productServerService.validateProductForCart(product);
        if (!validation.ok) {
          throw createApiError("VALIDATION_ERROR", validation.reason, 400);
        }
        const measurements = {
          weightGram: Number(product.shippingWeightGram),
          lengthCm: Number(product.shippingLengthCm),
          widthCm: Number(product.shippingWidthCm),
          heightCm: Number(product.shippingHeightCm),
        };
        if (Object.values(measurements).some((value) => !Number.isFinite(value) || value <= 0)) {
          throw createApiError(
            "VALIDATION_ERROR",
            `Berat/dimensi ${product.name} belum diatur di Admin Ofissio.`,
            400,
          );
        }
        return {
          name: product.name,
          description: product.short_description || product.description || product.sku,
          category: product.category || "apparel",
          quantity: item.quantity,
          value: Math.max(1, Math.round(product.priceFrom)),
          ...measurements,
        };
      }),
    );

    const enabledServices = await getCheckoutCourierSelection();
    const courierFilter = [
      ...new Set(
        enabledServices
          .map((key) => key.split(":")[0])
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    if (courierFilter.length === 0) {
      throw createApiError("PROVIDER_UNAVAILABLE", "Belum ada layanan kurir yang diaktifkan di Admin Ofissio.", 503);
    }
    const rates = await biteshipCarrierShippingProvider.getRates({
      orderId: `checkout-${request.companyId ?? "guest"}`,
      origin: config.origin,
      destination: {
        contactName: "Customer Ofissio",
        contactPhone: "00000000",
        address: request.destination.city,
        city: request.destination.city,
        postalCode: request.destination.postalCode,
      },
      items,
      courierFilter,
    });

    const selectedRates = rates.filter((rate) =>
      enabledServices.includes(`${rate.courierCompany.toLowerCase()}:*`) ||
      enabledServices.includes(`${rate.courierCompany.toLowerCase()}:${rate.courierType.toLowerCase()}`),
    );

    const mapped: ShippingRate[] = selectedRates.map((rate, index) => ({
      id: checkoutRateId(rate.providerQuoteId, index),
      provider: "biteship",
      courierCode: rate.courierCompany,
      courierName: courierLabel(rate.courierCompany),
      serviceCode: rate.courierType,
      serviceName: rate.courierService,
      price: rate.price,
      currency: "IDR",
      estimatedDays: rate.duration || "Estimasi dari kurir",
      isAvailable: true,
    }));

    if (mapped.length === 0) {
      throw createApiError(
        "PROVIDER_UNAVAILABLE",
        "Kurir belum tersedia untuk kode pos tujuan ini.",
        503,
      );
    }

    // Pickup is an Ofissio fulfillment option, not a rate returned by Biteship.
    mapped.push({
      id: "manual-pickup",
      provider: "manual",
      courierCode: "pickup",
      courierName: "Ambil sendiri",
      serviceCode: "PICKUP",
      serviceName: "Pickup",
      price: 0,
      currency: "IDR",
      estimatedDays: "Sesuai jadwal pickup",
      isAvailable: true,
    });
    return mapped;
  },
};

function checkoutRateId(providerId: string, index: number) {
  const safe = providerId.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 90);
  return `biteship-${safe || index}`;
}

function courierLabel(value: string) {
  const labels: Record<string, string> = {
    jne: "JNE",
    jnt: "J&T Express",
    sicepat: "SiCepat",
    anteraja: "AnterAja",
  };
  return labels[value.toLowerCase()] ?? value.toUpperCase();
}
