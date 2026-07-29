import { z } from "zod";

export const authSessionHintSchema = z.object({
  companyId: z.string().trim().min(1).max(100).optional().nullable(),
  companyName: z.string().trim().min(1).max(160).optional().nullable(),
  userId: z.string().trim().min(1).max(100).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  name: z.string().trim().min(1).max(160).optional().nullable(),
  role: z
    .enum(["company_admin", "purchasing", "approver", "finance", "viewer"])
    .optional()
    .nullable(),
});

export const signInPlaceholderSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
});
