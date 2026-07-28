export type ShippingProvider = "mock" | "manual";

export interface ShippingRate {
  id: string;
  provider: ShippingProvider;
  courierCode: string;
  courierName: string;
  serviceCode: string;
  serviceName: string;
  price: number;
  currency: "IDR";
  estimatedDays: string;
  isAvailable: boolean;
}

export interface ShippingRateRequest {
  origin: {
    city: string;
    postalCode: string;
  };
  destination: {
    city: string;
    postalCode: string;
  };
  items: Array<{
    productId: string;
    quantity: number;
    weightGram: number;
  }>;
}

export type ShipmentStatus =
  | "pending"
  | "ready_to_ship"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "failed"
  | "returned";

export interface CreateShipmentInput {
  orderId: string;
  shippingRateId: string;
  recipient: {
    name: string;
    phone: string;
    street: string;
    city: string;
    postalCode: string;
  };
}

export interface ShipmentRecord {
  id: string;
  orderId: string;
  shippingRateId: string;
  provider: ShippingProvider;
  trackingNumber: string | null;
  status: ShipmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingProviderAdapter {
  readonly name: ShippingProvider;
  getRates(input: {
    request: ShippingRateRequest;
    canonicalWeightGram: number;
  }): Promise<ShippingRate[]>;
}
