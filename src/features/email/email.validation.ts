import { z } from "zod";

import { EMAIL_TYPES } from "./email.types";

const safeEmail = z
  .string()
  .trim()
  .email()
  .max(254)
  .refine((value) => !/[\r\n]/.test(value), "Header email tidak valid.");

export const emailAddressSchema = safeEmail;
export const mailboxAddressSchema = z
  .string()
  .trim()
  .min(3)
  .max(320)
  .refine((value) => !/[\r\n]/.test(value), "Header email tidak valid.")
  .refine((value) => emailAddressSchema.safeParse(extractEmailAddress(value)).success, {
    message: "Alamat email tidak valid.",
  });

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

export function extractEmailAddress(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/<([^<>]+)>$/);
  return (match?.[1] ?? trimmed).trim();
}

export function isValidEmailAddress(value: string | null | undefined) {
  return Boolean(value && emailAddressSchema.safeParse(value).success);
}

export function isValidMailboxAddress(value: string | null | undefined) {
  return Boolean(value && mailboxAddressSchema.safeParse(value).success);
}
