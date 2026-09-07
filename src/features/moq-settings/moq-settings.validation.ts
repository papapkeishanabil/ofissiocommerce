import { z } from "zod";

// Batas sama dengan MOQ per produk (woocommerce-product-management.validation.ts).
const moqField = z.number().int().min(1).max(1_000_000);

export const moqSettingsPayloadSchema = z.object({
  fulfillment: moqField,
  customization: moqField,
  production: moqField,
  embroidery: moqField,
});

export type MoqSettingsPayload = z.infer<typeof moqSettingsPayloadSchema>;
