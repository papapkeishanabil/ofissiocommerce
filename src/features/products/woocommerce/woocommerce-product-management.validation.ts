import { z } from "zod";

import {
  WOO_EMBROIDERY_ZONES,
  WOO_FULFILLMENT_TYPES,
  WOO_GENDERS,
  WOO_PROCESS_ROUTES,
  WOO_PRODUCT_STATUSES,
  WOO_REPLENISHMENT_POLICIES,
  WOO_SLEEVE_TYPES,
  WOO_TRANSACTION_MODES,
} from "./woocommerce-product-management.types";

const shortText = z.string().trim().max(180);
const stringList = z.array(z.string().trim().min(1).max(100)).max(60);

export const adminWooProductPayloadSchema = z.object({
  name: z.string().trim().min(2).max(180),
  slug: z.string().trim().max(180).regex(/^[a-z0-9-]*$/).optional(),
  sku: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9._-]+$/),
  regularPrice: z.coerce.number().positive().max(10_000_000_000),
  status: z.enum(WOO_PRODUCT_STATUSES),
  description: z.string().trim().max(20_000),
  shortDescription: z.string().trim().max(2_000),
  categoryIds: z.array(z.coerce.number().int().positive()).min(1).max(30),
  industries: stringList.min(1),
  imageUrls: z.array(z.string().trim().url().max(2_000)).max(20),
  colors: stringList,
  sizes: stringList,
  materials: stringList,
  gender: z.enum(WOO_GENDERS),
  sleeveType: z.enum(WOO_SLEEVE_TYPES),
  safetyFeatures: stringList,
  moq: z.coerce.number().int().positive().max(1_000_000),
  leadTimeDays: z.coerce.number().int().positive().max(3_650),
  fulfillmentType: z.enum(WOO_FULFILLMENT_TYPES),
  transactionMode: z.enum(WOO_TRANSACTION_MODES),
  alwaysOrderable: z.boolean(),
  replenishmentPolicy: z.enum(WOO_REPLENISHMENT_POLICIES),
  processRoute: z.enum(WOO_PROCESS_ROUTES),
  supportsEmbroidery: z.boolean(),
  supportsScreenPrinting: z.boolean(),
  supportsDtf: z.boolean(),
  embroideryZones: z.array(z.enum(WOO_EMBROIDERY_ZONES)).max(WOO_EMBROIDERY_ZONES.length),
}).superRefine((value, context) => {
  if (value.supportsEmbroidery && value.embroideryZones.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["embroideryZones"],
      message: "Pilih minimal satu zona bordir.",
    });
  }
});

export const adminProductGlbVersionSchema = z.object({
  version: shortText
    .default("v1")
    .refine((value) => /^[A-Za-z0-9._-]+$/.test(value), "Versi GLB tidak valid."),
});

export type AdminWooProductPayload = z.infer<typeof adminWooProductPayloadSchema>;
