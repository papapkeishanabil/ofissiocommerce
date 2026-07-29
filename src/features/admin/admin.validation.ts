import { z } from "zod";

import { ADMIN_QUOTATION_UPDATE_STATUSES } from "./admin.config";

export const adminListQuerySchema = z.object({
  search: z.string().trim().max(160).optional(),
  status: z.string().trim().max(80).optional(),
});

export const adminIdParamSchema = z.object({
  id: z.string().trim().min(1).max(180),
});

export const adminQuotationStatusPatchSchema = z.object({
  status: z.enum(ADMIN_QUOTATION_UPDATE_STATUSES),
  internalNote: z.string().trim().max(500).optional(),
});

export type AdminQuotationUpdateStatus =
  (typeof ADMIN_QUOTATION_UPDATE_STATUSES)[number];
