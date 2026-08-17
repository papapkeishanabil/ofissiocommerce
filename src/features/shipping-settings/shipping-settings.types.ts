export interface BiteshipCourierService {
  key: string;
  courierCode: string;
  courierName: string;
  serviceCode: string;
  serviceName: string;
  serviceType: string | null;
  shippingType: string | null;
  description: string | null;
}

export interface ShippingSettingsState {
  enabledServices: string[];
  source: "supabase" | "mock" | "fallback";
  schemaReady: boolean;
  updatedAt: string | null;
}
