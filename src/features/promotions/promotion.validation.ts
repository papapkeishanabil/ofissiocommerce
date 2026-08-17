import { z } from "zod";

const optionalMoney = z.coerce.number().min(0).max(1_000_000_000).optional();

export const promotionPayloadSchema = z.object({
  code: z.string().trim().min(3).max(50).regex(/^[A-Za-z0-9_-]+$/).transform((value) => value.toUpperCase()),
  description: z.string().trim().max(300).optional().default(""),
  discountType: z.enum(["percent", "fixed_cart", "fixed_product"]),
  amount: z.coerce.number().positive().max(1_000_000_000),
  dateExpires: z.string().date().nullable().optional(),
  minimumAmount: optionalMoney,
  maximumAmount: optionalMoney,
  usageLimit: z.coerce.number().int().positive().max(1_000_000).nullable().optional(),
  usageLimitPerUser: z.coerce.number().int().positive().max(10_000).nullable().optional(),
  individualUse: z.boolean().optional().default(true),
  excludeSaleItems: z.boolean().optional().default(false),
  productIds: z.array(z.coerce.number().int().positive()).max(500).optional().default([]),
  categoryIds: z.array(z.coerce.number().int().positive()).max(200).optional().default([]),
}).superRefine((value, context) => {
  if (value.discountType === "percent" && value.amount > 100) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["amount"], message: "Persentase maksimal 100%." });
  }
  if (value.minimumAmount != null && value.maximumAmount != null && value.minimumAmount > value.maximumAmount) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["maximumAmount"], message: "Maksimum transaksi harus lebih besar dari minimum." });
  }
});

export type PromotionPayload = z.infer<typeof promotionPayloadSchema>;
