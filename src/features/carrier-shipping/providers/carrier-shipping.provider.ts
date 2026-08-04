import type {
  ProviderCreateShipmentResult,
  ProviderRateRequest,
  ProviderRateResult,
  ShippingQuoteRecord,
} from "../carrier-shipping.types";

export interface CarrierShippingProviderAdapter {
  getRates(request: ProviderRateRequest): Promise<ProviderRateResult[]>;
  createShipment(input: {
    referenceId: string;
    quote: ShippingQuoteRecord;
  }): Promise<ProviderCreateShipmentResult>;
  retrieveShipment?(providerShipmentId: string): Promise<ProviderCreateShipmentResult>;
}

