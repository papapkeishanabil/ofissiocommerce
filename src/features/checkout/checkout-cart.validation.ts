import { z } from "zod";

import { logoPlacementSchema } from "@/schemas/uniform-3d";

const quantitySchema = z.coerce.number().int().min(0).max(100_000);

export const checkoutSizeMatrixSchema = z.object({
  S: quantitySchema,
  M: quantitySchema,
  L: quantitySchema,
  XL: quantitySchema,
  "2XL": quantitySchema,
  "3XL": quantitySchema,
});

export const syncCheckoutCartSchema = z.object({
  companyId: z.string().trim().min(1).max(100),
  userId: z.string().trim().min(1).max(100),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1).max(100),
        selectedColor: z.string().trim().min(1).max(120),
        sizeMatrix: checkoutSizeMatrixSchema,
        customization: z.string().trim().max(500).nullable().default(null),
        embroideryPlacements: z.array(logoPlacementSchema).max(6).default([]),
      }),
    )
    .min(1)
    .max(50),
});
