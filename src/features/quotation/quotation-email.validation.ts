import { z } from "zod";

const sizeMatrixSchema = z.object({
  S: z.coerce.number().int().min(0).max(100_000),
  M: z.coerce.number().int().min(0).max(100_000),
  L: z.coerce.number().int().min(0).max(100_000),
  XL: z.coerce.number().int().min(0).max(100_000),
  "2XL": z.coerce.number().int().min(0).max(100_000),
  "3XL": z.coerce.number().int().min(0).max(100_000),
});

export const quotationEmailRequestSchema = z.object({
  companyId: z.string().trim().min(1).max(100),
  userId: z.string().trim().min(1).max(100),
  companyName: z.string().trim().min(1).max(160),
  picName: z.string().trim().min(1).max(120),
  picEmail: z.string().trim().email().max(160),
  quotation: z.object({
    id: z.string().trim().min(1).max(120),
    code: z.string().trim().min(1).max(80),
    notes: z.string().trim().max(500).nullable(),
    items: z
      .array(
        z.object({
          productName: z.string().trim().min(1).max(180),
          sku: z.string().trim().min(1).max(80),
          color: z.string().trim().min(1).max(120),
          sizes: sizeMatrixSchema,
          totalQty: z.coerce.number().int().positive().max(100_000),
          unitPrice: z.coerce.number().min(0).max(10_000_000_000),
          estimatedPrice: z.coerce.number().min(0).max(10_000_000_000),
          customization: z.string().trim().max(500).nullable(),
        }),
      )
      .min(1)
      .max(50),
  }),
});
