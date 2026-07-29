import { z } from "zod";

import { EMAIL_TYPES } from "./email.types";

const safeEmail = z
  .string()
  .trim()
  .email()
  .max(254)
  .refine((value) => !/[\r\n]/.test(value), "Header email tidak valid.");

export const emailAddressSchema = safeEmail;

export const sendEmailSchema = z.object({
  type: z.enum(EMAIL_TYPES),
  to: z.array(safeEmail).min(1).max(10),
  subject: z.string().trim().min(1).max(180).refine((value) => !/[\r\n]/.test(value)),
  html: z.string().min(1).max(60_000),
  text: z.string().min(1).max(20_000),
});

export const testEmailSchema = z.object({
  to: safeEmail.optional(),
});

export function safeEmailSubject(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 180);
}
