// src/schemas/auth.ts
// Zod validation for auth + company + address forms.

import { z } from "zod";

const phoneId = z
  .string()
  .min(8, "Nomor telepon minimal 8 digit")
  .max(20, "Nomor telepon terlalu panjang")
  .regex(/^[0-9+\-\s]+$/, "Hanya angka, +, -, spasi");

const emailId = z
  .string()
  .min(1, "Email wajib diisi")
  .email("Format email tidak valid");

export const loginSchema = z.object({
  email: emailId,
  password: z.string().min(1, "Password wajib diisi"),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().min(2, "Nama lengkap minimal 2 karakter"),
    email: emailId,
    whatsapp: phoneId,
    password: z.string().min(8, "Password minimal 8 karakter (B2B)"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi password tidak cocok",
  });
export type RegisterForm = z.infer<typeof registerSchema>;

export const companyProfileSchema = z.object({
  companyName: z.string().min(2, "Nama perusahaan minimal 2 karakter"),
  industry: z.string().min(1, "Pilih industri"),
  employeeCount: z.coerce
    .number({ invalid_type_error: "Harus berupa angka" })
    .int("Harus bilangan bulat")
    .min(1, "Minimal 1 karyawan"),
  npwp: z.string().optional(),
  phone: phoneId,
  picName: z.string().min(2, "Nama PIC minimal 2 karakter"),
  picEmail: emailId,
  picWhatsapp: phoneId,
});
export type CompanyProfileForm = z.infer<typeof companyProfileSchema>;

export const addressSchema = z.object({
  label: z.string().min(2, "Label alamat minimal 2 karakter"),
  recipientName: z.string().min(2, "Nama penerima minimal 2 karakter"),
  recipientPhone: phoneId,
  street: z.string().min(5, "Alamat jalan minimal 5 karakter"),
  city: z.string().min(2, "Kota minimal 2 karakter"),
  province: z.string().min(2, "Provinsi minimal 2 karakter"),
  postalCode: z
    .string()
    .min(5, "Kode pos 5 digit")
    .max(5, "Kode pos 5 digit")
    .regex(/^[0-9]+$/, "Kode pos hanya angka"),
  isDefaultShipping: z.boolean().optional(),
  isDefaultBilling: z.boolean().optional(),
});
export type AddressForm = z.infer<typeof addressSchema>;
