import { z } from "zod";

import { syncCheckoutCartSchema } from "@/features/checkout/checkout-cart.validation";
import { emailAddressSchema } from "@/features/email/email.validation";
import { QUOTATION_REQUIREMENT_TYPES } from "./quotation-requirement";

const optionalBriefText = (max: number) =>
  z.string().trim().max(max).nullish().transform((value) => value ?? null);

const productionBriefSchema = z.object({
  projectName: optionalBriefText(120),
  garmentType: optionalBriefText(120),
  estimatedQuantity: z.number().int().min(1).max(1_000_000).nullish().transform((value) => value ?? null),
  usageContext: optionalBriefText(300),
  designDescription: z.string().trim().max(1200),
  materialPreference: optionalBriefText(160),
  colorPreference: optionalBriefText(160),
  sizeNotes: optionalBriefText(300),
  targetDate: optionalBriefText(20),
  referenceFiles: z.array(z.object({
    fileId: z.string().trim().min(1).max(180),
    filename: z.string().trim().min(1).max(240),
    mimeType: z.string().trim().min(1).max(120),
    sizeBytes: z.number().int().min(0),
  })).max(5).optional(),
});

export const quotationRequestBodySchema = z
  .object({
    items: syncCheckoutCartSchema.shape.items,
    requirementType: z.enum(QUOTATION_REQUIREMENT_TYPES).default("standard_product"),
    productionBrief: productionBriefSchema
      .nullable()
      .optional(),
    customerNotes: z.string().trim().max(500).nullable().optional(),
    shippingDestination: z.string().trim().max(240).nullable().optional(),
    picName: z.string().trim().min(1).max(120).nullable().optional(),
    picEmail: emailAddressSchema.nullable().optional(),
    picWhatsapp: z.string().trim().min(3).max(40).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.requirementType === "custom_production" &&
      (value.productionBrief?.designDescription.trim().length ?? 0) < 10
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["productionBrief", "designDescription"],
        message: "Jelaskan desain atau kebutuhan produksi minimal 10 karakter.",
      });
    }
  });

export const customQuotationRequestBodySchema = z.object({
  productionBrief: productionBriefSchema.extend({
    projectName: z.string().trim().min(3).max(120),
    garmentType: z.string().trim().min(2).max(120),
    estimatedQuantity: z.number().int().min(1).max(1_000_000),
    designDescription: z.string().trim().min(10).max(1200),
  }),
  referenceFileIds: z.array(z.string().trim().min(1).max(180)).max(5).default([]),
  customerNotes: z.string().trim().max(1000).nullable().optional(),
  picName: z.string().trim().min(1).max(120).nullable().optional(),
  picEmail: emailAddressSchema.nullable().optional(),
  picWhatsapp: z.string().trim().min(3).max(40).nullable().optional(),
});

export const quotationListQuerySchema = z.object({
  companyId: z.string().trim().min(1).max(100).optional(),
  userId: z.string().trim().min(1).max(100).optional(),
});

export const quotationCustomerActionBodySchema = z.object({
  note: z.string().trim().max(1000).nullable().optional(),
});

export const quotationRevisionBodySchema = z.object({
  note: z.string().trim().min(1).max(1000),
});
