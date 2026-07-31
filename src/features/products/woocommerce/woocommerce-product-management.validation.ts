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
  WOO_QUANTITY_BASES,
  WOO_QUANTITY_PRICING_MODES,
  WOO_EMBROIDERY_PRICING_MODES,
} from "./woocommerce-product-management.types";
import { validateQuantityPricing } from "../quantity-pricing";
import { validateEmbroideryPricing } from "../embroidery-pricing";

const shortText = z.string().trim().max(180);
const stringList = z.array(z.string().trim().min(1).max(100)).max(60);
const quantityPricingTierSchema = z.object({
  minQty: z.coerce.number().int(),
  maxQty: z.preprocess(
    (value) => (value == null || value === "" ? null : value),
    z.union([z.null(), z.coerce.number().int()]),
  ),
  unitPrice: z.coerce.number(),
  label: z.string().trim().max(100).default(""),
});
const embroideryPricingZoneSchema = z.object({
  zoneId: z.enum(WOO_EMBROIDERY_ZONES),
  label: z.string().trim().min(1).max(100),
  enabled: z.boolean(),
  maxWidthCm: z.coerce.number(),
  maxHeightCm: z.coerce.number(),
  unitPrice: z.coerce.number(),
  setupFee: z.coerce.number(),
  pricingMode: z.enum(WOO_EMBROIDERY_PRICING_MODES),
  showSetupFee: z.boolean().default(false),
  notes: z.string().trim().max(500).optional(),
});

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
  embroideryPricingEnabled: z.boolean().default(true),
  embroideryPricingMode: z.enum(WOO_EMBROIDERY_PRICING_MODES).default("flat_per_piece"),
  embroideryPricingZones: z.array(embroideryPricingZoneSchema).max(WOO_EMBROIDERY_ZONES.length).default([]),
  quantityPricingEnabled: z.boolean().default(true),
  quantityPricingMode: z.enum(WOO_QUANTITY_PRICING_MODES).default("fixed_unit_price"),
  quantityBasis: z.enum(WOO_QUANTITY_BASES).default("total_order_qty"),
  quantityPricingTiers: z.array(quantityPricingTierSchema).max(50).default([]),
}).superRefine((value, context) => {
  if (value.supportsEmbroidery && value.embroideryZones.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["embroideryZones"],
      message: "Pilih minimal satu zona bordir.",
    });
  }
  const embroideryPricing = validateEmbroideryPricing({
    enabled: value.embroideryPricingEnabled,
    zones: value.embroideryPricingZones,
    supportsEmbroidery: value.supportsEmbroidery,
  });
  for (const issue of embroideryPricing.errors) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["embroideryPricingZones", ...(issue.zoneIndex == null ? [] : [issue.zoneIndex])],
      message: issue.message,
    });
  }
  const pricing = validateQuantityPricing({
    enabled: value.quantityPricingEnabled,
    tiers: value.quantityPricingTiers,
    moq: value.moq,
  });
  for (const issue of pricing.errors) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["quantityPricingTiers", ...(issue.tierIndex == null ? [] : [issue.tierIndex])],
      message: issue.message,
    });
  }
});

export const adminWooEmbroideryPricingPayloadSchema = z.object({
  embroideryPricingEnabled: z.boolean(),
  embroideryPricingMode: z.enum(WOO_EMBROIDERY_PRICING_MODES),
  supportsEmbroidery: z.boolean(),
  zones: z.array(embroideryPricingZoneSchema).max(WOO_EMBROIDERY_ZONES.length),
}).superRefine((value, context) => {
  const pricing = validateEmbroideryPricing({
    enabled: value.embroideryPricingEnabled,
    zones: value.zones,
    supportsEmbroidery: value.supportsEmbroidery,
  });
  for (const issue of pricing.errors) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["zones", ...(issue.zoneIndex == null ? [] : [issue.zoneIndex])],
      message: issue.message,
    });
  }
});

export const adminWooQuantityPricingPayloadSchema = z.object({
  quantityPricingEnabled: z.boolean(),
  quantityPricingMode: z.enum(WOO_QUANTITY_PRICING_MODES),
  quantityBasis: z.enum(WOO_QUANTITY_BASES),
  tiers: z.array(quantityPricingTierSchema).max(50),
  moq: z.coerce.number().int().positive().max(1_000_000),
}).superRefine((value, context) => {
  const pricing = validateQuantityPricing({
    enabled: value.quantityPricingEnabled,
    tiers: value.tiers,
    moq: value.moq,
  });
  for (const issue of pricing.errors) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["tiers", ...(issue.tierIndex == null ? [] : [issue.tierIndex])],
      message: issue.message,
    });
  }
});

export const adminProductGlbVersionSchema = z.object({
  version: shortText
    .default("v1")
    .refine((value) => /^[A-Za-z0-9._-]+$/.test(value), "Versi GLB tidak valid."),
});

export type AdminWooProductPayload = z.infer<typeof adminWooProductPayloadSchema>;
export type AdminWooQuantityPricingPayload = z.infer<typeof adminWooQuantityPricingPayloadSchema>;
export type AdminWooEmbroideryPricingPayload = z.infer<typeof adminWooEmbroideryPricingPayloadSchema>;
