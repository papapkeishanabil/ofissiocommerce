import "server-only";

import type {
  ShippingProviderAdapter,
  ShippingRate,
} from "../shipping.types";

const MOCK_RATES: ShippingRate[] = [
  {
    id: "mock-jne-reg",
    provider: "mock",
    courierCode: "jne",
    courierName: "JNE",
    serviceCode: "REG",
    serviceName: "Regular",
    price: 25_000,
    currency: "IDR",
    estimatedDays: "2-3 hari",
    isAvailable: true,
  },
  {
    id: "mock-jnt-ez",
    provider: "mock",
    courierCode: "jnt",
    courierName: "J&T",
    serviceCode: "EZ",
    serviceName: "EZ",
    price: 23_000,
    currency: "IDR",
    estimatedDays: "2-4 hari",
    isAvailable: true,
  },
  {
    id: "mock-cargo",
    provider: "mock",
    courierCode: "cargo",
    courierName: "Cargo",
    serviceCode: "CARGO",
    serviceName: "Cargo",
    price: 85_000,
    currency: "IDR",
    estimatedDays: "3-5 hari",
    isAvailable: true,
  },
  {
    id: "mock-pickup",
    provider: "mock",
    courierCode: "pickup",
    courierName: "Ambil sendiri",
    serviceCode: "PICKUP",
    serviceName: "Pickup",
    price: 0,
    currency: "IDR",
    estimatedDays: "Sesuai jadwal pickup",
    isAvailable: true,
  },
];

export const mockShippingProvider: ShippingProviderAdapter = {
  name: "mock",
  async getRates() {
    return MOCK_RATES.map((rate) => ({ ...rate }));
  },
};
