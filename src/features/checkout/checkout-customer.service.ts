import "server-only";
import type { AuthSession } from "@/features/auth/auth.types";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import { addressSchema, companyProfileSchema } from "@/schemas/auth";
import { createApiError } from "@/lib/security/safe-error-response";
import type { CheckoutCustomer } from "./checkout-customer";

/** Resolve identity and address from the authenticated tenant, never client profile fields. */
export async function resolveCheckoutCustomer(
  session: AuthSession,
  type: "individual" | "company",
  addressId?: string,
): Promise<CheckoutCustomer> {
  const client = getSupabaseAdminClient();
  if (!client) throw createApiError("PROVIDER_UNAVAILABLE", "Data customer belum tersedia.", 503);
  if (!addressId) throw createApiError("BAD_REQUEST", "Simpan alamat pengiriman terlebih dahulu.", 400);
  const addresses = await client.select("company_addresses", {
    filters: { id: addressId, company_id: session.companyId }, limit: 1,
  });
  const row = addresses[0];
  if (!row) throw createApiError("NOT_FOUND", "Alamat pengiriman tidak ditemukan.", 404);
  const address = addressSchema.parse({
    label: row.label, recipientName: row.recipient_name, recipientPhone: row.phone,
    street: row.address_line, city: row.city, province: row.province, postalCode: row.postal_code,
    isDefaultShipping: Boolean(row.is_default_shipping ?? row.is_default),
    isDefaultBilling: Boolean(row.is_default_billing ?? row.is_default),
  });
  const customer: CheckoutCustomer = {
    type, name: session.name || address.recipientName, email: session.email || "",
    phone: address.recipientPhone,
    shippingAddress: { ...address, id: addressId, isDefaultShipping: !!address.isDefaultShipping, isDefaultBilling: !!address.isDefaultBilling },
  };
  if (type === "company") {
    const companies = await client.select("companies", { filters: { id: session.companyId }, limit: 1 });
    const company = companies[0] ?? {};
    const parsed = companyProfileSchema.safeParse({
      companyName: company.name, industry: company.industry, employeeCount: company.employee_count,
      npwp: company.npwp ?? "", phone: company.phone,
      picName: company.pic_name, picEmail: company.pic_email, picWhatsapp: company.pic_whatsapp,
    });
    if (!parsed.success) throw createApiError("BAD_REQUEST", "Lengkapi dan simpan profil perusahaan terlebih dahulu.", 400);
    customer.companyName = parsed.data.companyName;
    customer.npwp = parsed.data.npwp;
    customer.name = parsed.data.picName;
    customer.email = parsed.data.picEmail;
    customer.phone = parsed.data.picWhatsapp;
  }
  return customer;
}
