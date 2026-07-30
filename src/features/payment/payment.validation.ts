import { z } from "zod";

export const createPaymentSchema = z.object({
  cartId: z.string().trim().min(1).max(120).optional(),
  orderId: z.string().trim().min(1).max(140).optional(),
  companyId: z.string().trim().min(1).max(100),
  userId: z.string().trim().min(1).max(100),
  shippingRateId: z.string().trim().min(1).max(120).nullable(),
}).refine((value) => Boolean(value.cartId) !== Boolean(value.orderId), {
  message: "Pilih cartId atau orderId, bukan keduanya.",
});

export const paymentStatusQuerySchema = z.object({
  paymentId: z.string().trim().min(1).max(120).optional(),
  orderId: z.string().trim().min(1).max(140).optional(),
  companyId: z.string().trim().min(1).max(100).optional(),
  userId: z.string().trim().min(1).max(100).optional(),
}).refine((value) => Boolean(value.paymentId) || Boolean(value.orderId), {
  message: "paymentId atau orderId wajib diisi.",
});

/**
 * Provisional callback envelope. Exact iPaymu callback field names must be
 * aligned with the merchant's official iPaymu documentation before live mode.
 */
export const paymentCallbackSchema = z
  .object({
    reference_id: z.string().trim().min(1).max(160).optional(),
    referenceId: z.string().trim().min(1).max(160).optional(),
    amount: z.coerce.number().positive(),
    status: z.union([z.string(), z.number()]).transform(String),
    transaction_id: z.union([z.string(), z.number()]).transform(String).optional(),
    trx_id: z.union([z.string(), z.number()]).transform(String).optional(),
    sid: z.union([z.string(), z.number()]).transform(String).optional(),
    status_code: z.union([z.string(), z.number()]).transform(String).optional(),
    transaction_status_code: z.union([z.string(), z.number()]).transform(String).optional(),
    paid_at: z.union([z.string(), z.number()]).transform(String).optional(),
    expired_at: z.union([z.string(), z.number()]).transform(String).optional(),
    via: z.string().optional(),
    channel: z.string().optional(),
    payment_no: z.union([z.string(), z.number()]).transform(String).optional(),
  })
  .passthrough()
  .refine((value) => Boolean(value.reference_id ?? value.referenceId), {
    message: "reference_id wajib diisi.",
  });

export const mockPaymentCompletionSchema = z.object({
  paymentId: z.string().trim().min(1).max(120),
  status: z.enum(["paid", "failed"]),
  companyId: z.string().trim().min(1).max(100).optional(),
  userId: z.string().trim().min(1).max(100).optional(),
});
