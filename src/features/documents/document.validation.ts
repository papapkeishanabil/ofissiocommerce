import { z } from "zod";

import { DOCUMENT_TEMPLATE_IDS } from "./document.types";

export const documentIdParamSchema = z.object({
  id: z.string().trim().min(1).max(180),
});

export const generateQuotationPdfBodySchema = z.object({
  templateId: z.enum(DOCUMENT_TEMPLATE_IDS).optional(),
  forceRegenerate: z.boolean().optional().default(false),
  allowDraft: z.boolean().optional().default(false),
});

export const generateInvoicePdfBodySchema = z.object({
  templateId: z.enum(DOCUMENT_TEMPLATE_IDS).optional(),
  forceRegenerate: z.boolean().optional().default(false),
});
