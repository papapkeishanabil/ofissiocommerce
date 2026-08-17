import { z } from "zod";

export const shippingSettingsPayloadSchema = z.object({
  enabledServices: z
    .array(z.string().trim().regex(/^[a-z0-9_-]+:[a-z0-9_-]+$/i).max(80))
    .max(150)
    .transform((values) => [...new Set(values.map((value) => value.toLowerCase()))].sort()),
});

export type ShippingSettingsPayload = z.infer<typeof shippingSettingsPayloadSchema>;
