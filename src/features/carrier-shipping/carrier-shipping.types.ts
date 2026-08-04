export type CarrierShippingProvider = "mock" | "biteship";
export type CarrierShippingMode = "sandbox" | "live";

export type CarrierShipmentStatus =
  | "waiting_shipment"
  | "shipment_created"
  | "pickup_scheduled"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "delivery_failed"
  | "returned"
  | "cancelled"
  | "manual_review";

export interface ShippingAddressSnapshot {
  contactName: string;
  contactPhone: string;
  address: string;
  city?: string | null;
  province?: string | null;
  postalCode: string;
  areaId?: string | null;
}

export interface ShippingPackageItemSnapshot {
  name: string;
  description: string;
  category: string;
  quantity: number;
  value: number;
  weightGram: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface ShippingQuoteRecord {
  id: string;
  orderId: string;
  companyId: string;
  provider: CarrierShippingProvider;
  providerQuoteId: string;
  courierCompany: string;
  courierType: string;
  courierService: string;
  shippingPrice: number;
  currency: "IDR";
  duration: string | null;
  shippingPriceSnapshot: Record<string, unknown>;
  originSnapshot: ShippingAddressSnapshot;
  destinationSnapshot: ShippingAddressSnapshot;
  packageSnapshot: ShippingPackageItemSnapshot[];
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CarrierShipmentRecord {
  id: string;
  orderId: string;
  companyId: string;
  quoteId: string;
  provider: CarrierShippingProvider;
  providerShipmentId: string | null;
  biteshipOrderId: string | null;
  biteshipWaybillId: string | null;
  courierCompany: string;
  courierType: string;
  courierService: string;
  shipmentStatus: CarrierShipmentStatus;
  shippingPrice: number;
  shippingPriceSnapshot: Record<string, unknown>;
  originSnapshot: ShippingAddressSnapshot;
  destinationSnapshot: ShippingAddressSnapshot;
  packageSnapshot: ShippingPackageItemSnapshot[];
  trackingUrl: string | null;
  providerStatus: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CarrierShippingEventRecord {
  id: string;
  shipmentId: string;
  orderId: string;
  companyId: string;
  eventType: string;
  oldStatus: CarrierShipmentStatus | null;
  newStatus: CarrierShipmentStatus | null;
  providerStatus: string | null;
  webhookEventId: string | null;
  safeMetadata: Record<string, unknown>;
  createdAt: string;
}

export interface CarrierShippingState {
  quotes: ShippingQuoteRecord[];
  shipment: CarrierShipmentRecord | null;
  events: CarrierShippingEventRecord[];
}

export interface ProviderRateRequest {
  orderId: string;
  origin: ShippingAddressSnapshot;
  destination: ShippingAddressSnapshot;
  items: ShippingPackageItemSnapshot[];
  courierFilter?: string[];
}

export interface ProviderRateResult {
  providerQuoteId: string;
  courierCompany: string;
  courierType: string;
  courierService: string;
  price: number;
  duration: string | null;
  safeSnapshot: Record<string, unknown>;
}

export interface ProviderCreateShipmentResult {
  providerShipmentId: string;
  waybillId: string | null;
  status: string;
  trackingUrl: string | null;
  price: number;
  safeSnapshot: Record<string, unknown>;
}

