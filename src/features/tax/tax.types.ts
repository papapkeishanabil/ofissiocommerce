export const TAX_CALCULATION_BASES = ["after_discount"] as const;

export type TaxCalculationBasis = (typeof TAX_CALCULATION_BASES)[number];

export interface TaxSettings {
  id: "default";
  enabled: boolean;
  rate: number;
  label: string;
  calculationBasis: TaxCalculationBasis;
  updatedAt: string;
}

export interface TaxSettingsState {
  settings: TaxSettings;
  source: "supabase" | "mock" | "fallback";
  schemaReady: boolean;
}

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  id: "default",
  enabled: true,
  rate: 11,
  label: "PPN",
  calculationBasis: "after_discount",
  updatedAt: "1970-01-01T00:00:00.000Z",
};
