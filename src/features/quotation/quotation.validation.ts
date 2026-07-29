import { z } from "zod";

import { syncCheckoutCartSchema } from "@/features/checkout/checkout-cart.validation";
import { emailAddressSchema } from "@/features/email/email.validation";

export const quotationRequestBodySchema = z.object({
  items: syncCheckoutCartSchema.shape.items,
  customerNotes: z.string().trim().max(500).nullable().optional(),
  shippingDestination: z.string().trim().max(240).nullable().optional(),
  picName: z.string().trim().min(1).max(120).nullable().optional(),
  picEmail: emailAddressSchema.nullable().optional(),
  picWhatsapp: z.string().trim().min(3).max(40).nullable().optional(),
});

export const quotationListQuerySchema = z.object({
  companyId: z.string().trim().min(1).max(100).optional(),
  userId: z.string().trim().min(1).max(100).optional(),
});
