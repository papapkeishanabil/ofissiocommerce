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
  WOO_MODEL_ORIENTATION_Y_OPTIONS,
} from "./woocommerce-product-management.types";
import { validateQuantityPricing } from "../quantity-pricing";
import { isWordPressMediaProxyUrl } from "./wordpress-media-proxy";

const shortText = z.string().trim().max(180);
const stringList = z.array(z.string().trim().min(1).max(100)).max(60);
// Form admin menerima URL gambar hasil proxy same-origin (base media
// loopback LocalWP). buildWritePayload mengembalikannya ke URL absolut
// sebelum menulis ke WooCommerce, jadi kedua bentuk sah di payload.
const wooImageSource = z
  .string()
  .trim()
  .max(2_000)
  .refine(
    (value) =>
      isWordPressMediaProxyUrl(value) ||
      z.string().url().safeParse(value).success,
    "URL gambar produk tidak valid.",
  );
const quantityPricingTierSchema = z.object({
  minQty: z.coerce.number().int(),
  maxQty: z.preprocess(
    (value) => (value == null || value === "" ? null : value),
    z.union([z.null(), z.coerce.number().int()]),
  ),
  unitPrice: z.coerce.number(),
  label: z.string().trim().max(100).default(""),
});

export const adminWooProductPayloadSchema = z.object({
  productKind: z.enum(["simple", "variable"]).optional(),
  modelCode: z.string().trim().max(80).regex(/^[A-Za-z0-9._-]*$/).optional(),
  name: z.string().trim().min(2).max(180),
  slug: z.string().trim().max(180).regex(/^[a-z0-9-]*$/).optional(),
  sku: z.string().trim().max(100).regex(/^[A-Za-z0-9._-]*$/),
  regularPrice: z.coerce.number().positive().max(10_000_000_000),
  weightGram: z.coerce.number().positive().max(1_000_000),
  lengthCm: z.coerce.number().positive().max(1_000),
  widthCm: z.coerce.number().positive().max(1_000),
  heightCm: z.coerce.number().positive().max(1_000),
  status: z.enum(WOO_PRODUCT_STATUSES),
  description: z.string().trim().max(20_000),
  shortDescription: z.string().trim().max(2_000),
  categoryIds: z.array(z.coerce.number().int().positive()).min(1).max(30),
  industries: stringList.min(1),
  imageUrls: z.array(wooImageSource).max(20),
  colors: stringList.min(1, "Pilih minimal satu warna dari master."),
  sizes: stringList.min(1, "Pilih minimal satu ukuran dari master."),
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
  quantityPricingEnabled: z.boolean().default(true),
  quantityPricingMode: z.enum(WOO_QUANTITY_PRICING_MODES).default("fixed_unit_price"),
  quantityBasis: z.enum(WOO_QUANTITY_BASES).default("total_order_qty"),
  quantityPricingTiers: z.array(quantityPricingTierSchema).max(50).default([]),
  model3dExposure: z.coerce.number().min(0.3).max(2).optional(),
  model3dEmissive: z.coerce.number().min(0).max(1).optional(),
  model3dBrightness: z.coerce.number().min(0.5).max(1.5).optional(),
  model3dSaturation: z.coerce.number().min(0).max(1.5).optional(),
  model3dHue: z.coerce.number().min(-60).max(60).optional(),
  model3dTemperature: z.coerce.number().min(-1).max(1).optional(),
  model3dRotationY: z.coerce
    .number()
    .refine(
      (value) => WOO_MODEL_ORIENTATION_Y_OPTIONS.includes(value as never),
      "Orientasi model harus 0°, 90°, 180°, atau 270°.",
    )
    .optional(),
}).superRefine((value, context) => {
  if (value.productKind === "variable" ? !value.modelCode : !value.sku) {
    context.addIssue({ code: "custom", path: [value.productKind === "variable" ? "modelCode" : "sku"], message: value.productKind === "variable" ? "Kode model utama wajib diisi." : "SKU produk wajib diisi." });
  }
  if (value.productKind === "simple" && (value.colors.length > 1 || value.sizes.length > 1)) {
    context.addIssue({ code: "custom", path: ["productKind"], message: "Produk dengan pilihan warna atau ukuran harus menggunakan jenis Dengan varian." });
  }
  if (value.productKind === "simple" && value.sizes.some(size => size !== "OS")) {
    context.addIssue({ code: "custom", path: ["sizes"], message: "Produk tanpa varian memakai satu jumlah produk (OS). Gunakan Dengan varian untuk pilihan ukuran." });
  }
  if (value.supportsEmbroidery && value.embroideryZones.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["embroideryZones"],
      message: "Pilih minimal satu zona bordir.",
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
