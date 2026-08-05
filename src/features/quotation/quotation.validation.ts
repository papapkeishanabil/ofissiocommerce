import { z } from "zod";

import { syncCheckoutCartSchema } from "@/features/checkout/checkout-cart.validation";
import { emailAddressSchema } from "@/features/email/email.validation";
import { QUOTATION_REQUIREMENT_TYPES } from "./quotation-requirement";
import {
  CUSTOM_REQUEST_INTAKE_CHANNELS,
  TECHNICAL_GARMENT_CATEGORIES,
  TECHNICAL_SPEC_STATUSES,
} from "./quotation.types";

const optionalBriefText = (max: number) =>
  z.string().trim().max(max).nullish().transform((value) => value ?? null);

const technicalSpecificationValueSchema = z.object({
  key: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  status: z.enum(TECHNICAL_SPEC_STATUSES),
  option: optionalBriefText(160),
  detail: optionalBriefText(240),
  notes: optionalBriefText(400),
});

const technicalGarmentSpecificationSchema = z.object({
  id: z.string().trim().min(1).max(100),
  category: z.enum(TECHNICAL_GARMENT_CATEGORIES),
  garmentType: z.string().trim().min(2).max(120),
  templateKey: optionalBriefText(80),
  quantity: z.number().int().min(1).max(1_000_000),
  specifications: z.array(technicalSpecificationValueSchema).max(40),
  sizeBreakdown: z.array(z.object({
    size: z.string().trim().min(1).max(40),
    quantity: z.number().int().min(0).max(1_000_000),
  })).max(30),
});

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
  intakeChannel: z.enum(CUSTOM_REQUEST_INTAKE_CHANNELS).optional(),
  externalReference: optionalBriefText(120),
  technicalSpecifications: z.array(technicalGarmentSpecificationSchema).max(8).optional(),
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

export const adminSalesAssistedQuotationBodySchema = z.object({
  companyId: z.string().trim().min(1).max(100),
  picName: z.string().trim().min(2).max(120),
  picEmail: emailAddressSchema,
  picWhatsapp: z.string().trim().min(3).max(40).nullable().optional(),
  productionBrief: productionBriefSchema.extend({
    projectName: z.string().trim().min(3).max(120),
    garmentType: z.string().trim().min(2).max(120),
    estimatedQuantity: z.number().int().min(1).max(1_000_000),
    designDescription: z.string().trim().min(10).max(1200),
    intakeChannel: z.enum(CUSTOM_REQUEST_INTAKE_CHANNELS).default("whatsapp"),
    technicalSpecifications: z
      .array(technicalGarmentSpecificationSchema)
      .min(1)
      .max(8),
  }),
  customerNotes: z.string().trim().max(1000).nullable().optional(),
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

export const customBriefApprovalBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    note: z.string().trim().max(1000).nullable().optional(),
  }),
  z.object({
    action: z.literal("request_revision"),
    note: z.string().trim().min(3).max(1000),
  }),
]);
