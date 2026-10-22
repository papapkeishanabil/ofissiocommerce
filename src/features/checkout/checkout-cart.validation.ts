import { z } from "zod";
import { selectedOptionsSchema } from "@/features/products/product-variants";

import { logoPlacementSchema } from "@/schemas/uniform-3d";
import { validateNameAllocations } from "@/lib/embroidery-names";

const quantitySchema = z.coerce.number().int().min(0).max(100_000);

export const checkoutSizeMatrixSchema = z.object({
  OS: quantitySchema.optional().default(0),
  XS: quantitySchema.optional().default(0),
  "4XL": quantitySchema.optional().default(0),
  "5XL": quantitySchema.optional().default(0),
  S: quantitySchema,
  M: quantitySchema,
  L: quantitySchema,
  XL: quantitySchema,
  "2XL": quantitySchema,
  "3XL": quantitySchema,
});

export const syncCheckoutCartSchema = z.object({
  orderNote: z.string().trim().max(1000).optional(),
  companyId: z.string().trim().min(1).max(100),
  userId: z.string().trim().min(1).max(100),
  promotionCode: z.string().trim().min(3).max(50).nullable().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1).max(100),
        selectedColor: z.string().trim().min(1).max(120),
        selectedSleeve: z.string().trim().min(1).max(100).optional(),
        selectedOptions: selectedOptionsSchema.optional(),
        sizeMatrix: checkoutSizeMatrixSchema,
        customization: z.string().trim().max(500).nullable().default(null),
        embroideryPlacements: z.array(logoPlacementSchema).max(6).default([]),
      }).superRefine((item, ctx) => {
        const issue = validateNameAllocations(item.embroideryPlacements, item.sizeMatrix);
        if (issue) ctx.addIssue({ code: "custom", message: issue, path: ["embroideryPlacements"] });
        if (new Set(item.embroideryPlacements.map(p => p.zone)).size !== item.embroideryPlacements.length) ctx.addIssue({ code: "custom", message: "Zona bordir tidak boleh berulang.", path: ["embroideryPlacements"] });
      }),
    )
    .min(1)
    .max(50),
});
