import { z } from "zod";
import { adminQuotationPricingSchema } from "@/features/admin/admin.validation";
import { embroideryEstimatePayloadSchema } from "./embroidery-estimate.validation";

export const quotationWorkbenchSchema = z.object({
  pricing: adminQuotationPricingSchema,
  estimate: embroideryEstimatePayloadSchema.optional(),
  publish: z.boolean(),
});
