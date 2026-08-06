import { z } from "zod";

const sku = z
  .string()
  .trim()
  .min(2)
  .max(128)
  .regex(/^[A-Za-z0-9._-]+$/, "SKU tidak valid.");

export const replenishmentRequestSchema = z.object({
  orderId: z.string().trim().min(3).max(160).nullable().optional(),
  parentSku: sku,
  stockSku: sku,
  reason: z.enum(["low_stock", "order_shortage", "replenishment"]).optional(),
});
