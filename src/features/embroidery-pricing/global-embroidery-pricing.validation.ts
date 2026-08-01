import { z } from "zod";

import {
  EMBROIDERY_PRICING_ZONE_IDS,
} from "@/features/products/embroidery-pricing";

export const globalEmbroideryPricingPayloadSchema = z.object({
  zones: z.array(z.object({
    zoneId: z.enum(EMBROIDERY_PRICING_ZONE_IDS),
    label: z.string().trim().min(1).max(100),
    enabled: z.boolean(),
    maxWidthCm: z.coerce.number().positive().max(500),
    maxHeightCm: z.coerce.number().positive().max(500),
    unitPrice: z.coerce.number().int().positive().max(1_000_000_000),
    setupFee: z.coerce.number().int().min(0).max(1_000_000_000),
    showSetupFee: z.boolean(),
    pricingMode: z.literal("flat_per_piece"),
    notes: z.string().trim().max(500).default(""),
    sortOrder: z.coerce.number().int().min(0).max(10_000),
  })).length(EMBROIDERY_PRICING_ZONE_IDS.length),
}).superRefine((value, context) => {
  const ids = value.zones.map((zone) => zone.zoneId);
  if (new Set(ids).size !== EMBROIDERY_PRICING_ZONE_IDS.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["zones"], message: "Setiap zona global harus unik." });
  }
  for (const zoneId of EMBROIDERY_PRICING_ZONE_IDS) {
    if (!ids.includes(zoneId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["zones"], message: `Zona ${zoneId} wajib tersedia.` });
    }
  }
});

export type GlobalEmbroideryPricingPayload = z.infer<typeof globalEmbroideryPricingPayloadSchema>;
