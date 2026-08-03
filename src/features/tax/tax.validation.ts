import { z } from "zod";

export const taxSettingsPayloadSchema = z.object({
  enabled: z.boolean(),
  rate: z.coerce.number().min(0).max(100),
  label: z.string().trim().min(1).max(30).default("PPN"),
});

export type TaxSettingsPayload = z.infer<typeof taxSettingsPayloadSchema>;
