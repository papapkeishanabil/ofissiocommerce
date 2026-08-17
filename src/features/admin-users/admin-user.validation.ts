import { z } from "zod";

export const createInternalUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
  role: z.enum(["sales_admin", "support", "sales"]),
});

export const updateInternalUserSchema = z.object({
  role: z.enum(["sales_admin", "support", "sales"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
}).refine((value) => value.role !== undefined || value.status !== undefined, {
  message: "Tidak ada perubahan user.",
});

export const internalUserIdSchema = z.object({ id: z.string().uuid() });
