import { z } from "zod";

import { ADMIN_QUOTATION_UPDATE_STATUSES } from "./admin.config";

export const adminListQuerySchema = z.object({
  search: z.string().trim().max(160).optional(),
  status: z.string().trim().max(80).optional(),
});

export const adminIdParamSchema = z.object({
  id: z.string().trim().min(1).max(180),
});

export const adminWooProductIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const adminQuotationStatusPatchSchema = z.object({
  status: z.enum(ADMIN_QUOTATION_UPDATE_STATUSES),
  internalNote: z.string().trim().max(500).optional(),
});

const moneySchema = z.coerce.number().min(0).max(10_000_000_000);

export const adminQuotationPatchSchema = z.union([
  z.object({
    action: z.literal("update_status"),
    status: z.enum(ADMIN_QUOTATION_UPDATE_STATUSES),
    internalNote: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal("update_pricing"),
    items: z
      .array(
        z.object({
          itemId: z.string().trim().min(1).max(180),
          unitPrice: moneySchema,
          discountAmount: moneySchema.optional(),
          finalUnitPrice: moneySchema.nullable().optional(),
          embroideryLines: z.array(z.object({
            zoneId: z.string().trim().min(1).max(80),
            unitPrice: moneySchema,
            setupFee: moneySchema.optional(),
          })).max(12).optional(),
        }),
      )
      .min(1)
      .max(50),
    discountTotal: moneySchema.optional(),
    taxTotal: moneySchema.optional(),
    shippingEstimate: moneySchema.optional(),
    customerMessage: z.string().trim().max(1000).nullable().optional(),
    salesNotes: z.string().trim().max(1000).nullable().optional(),
    validUntil: z.string().trim().max(80).nullable().optional(),
    salesEmail: z.string().trim().email().max(160).nullable().optional(),
  }),
  z.object({
    action: z.literal("add_internal_note"),
    note: z.string().trim().min(1).max(1000),
  }),
  z.object({
    action: z.literal("send_quote_to_customer"),
  }),
  z.object({
    action: z.literal("convert_to_order"),
  }),
  // Backward-compatible Phase 16 payload shape.
  z.object({
    status: z.enum(ADMIN_QUOTATION_UPDATE_STATUSES),
    internalNote: z.string().trim().max(500).optional(),
  }),
]);

export type AdminQuotationUpdateStatus =
  (typeof ADMIN_QUOTATION_UPDATE_STATUSES)[number];

export type AdminQuotationPatchPayload = z.infer<typeof adminQuotationPatchSchema>;
