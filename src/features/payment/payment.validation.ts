import { z } from "zod";

export const createPaymentSchema = z.object({
  cartId: z.string().trim().min(1).max(120),
  companyId: z.string().trim().min(1).max(100),
  userId: z.string().trim().min(1).max(100),
  shippingRateId: z.string().trim().min(1).max(120).nullable(),
});

export const paymentStatusQuerySchema = z.object({
  paymentId: z.string().trim().min(1).max(120),
  companyId: z.string().trim().min(1).max(100).optional(),
  userId: z.string().trim().min(1).max(100).optional(),
});

/**
 * Provisional callback envelope. Exact iPaymu callback field names must be
 * aligned with the merchant's official iPaymu documentation before live mode.
 */
export const paymentCallbackSchema = z
  .object({
    reference_id: z.string().trim().min(1).max(160),
    amount: z.coerce.number().positive(),
    status: z.union([z.string(), z.number()]).transform(String),
    transaction_id: z.union([z.string(), z.number()]).transform(String).optional(),
  })
  .passthrough();

export const mockPaymentCompletionSchema = z.object({
  paymentId: z.string().trim().min(1).max(120),
  status: z.enum(["paid", "failed"]),
  companyId: z.string().trim().min(1).max(100).optional(),
  userId: z.string().trim().min(1).max(100).optional(),
});
