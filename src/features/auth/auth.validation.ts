import { z } from "zod";

export const authSessionHintSchema = z.object({
  companyId: z.string().trim().min(1).max(100).optional().nullable(),
  companyName: z.string().trim().min(1).max(160).optional().nullable(),
  userId: z.string().trim().min(1).max(100).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  name: z.string().trim().min(1).max(160).optional().nullable(),
  role: z
    .enum([
      "customer_admin",
      "customer_user",
      "company_admin",
      "purchasing",
      "approver",
      "finance",
      "viewer",
    ])
    .optional()
    .nullable(),
});

export const signInPlaceholderSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
});

export const registerProductionSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254),
  whatsapp: z.string().trim().min(8).max(30),
  password: z.string().min(8).max(200),
  companyName: z.string().trim().min(2).max(180).optional(),
});
