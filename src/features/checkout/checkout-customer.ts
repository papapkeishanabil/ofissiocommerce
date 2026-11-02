import { companyProfileSchema } from "@/schemas/auth";
import type { Address, Company } from "@/types/account";

export interface CheckoutCustomer {
  type: "individual" | "company";
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  npwp?: string;
  shippingAddress: Address;
}

export function checkoutPhone(value: string | null | undefined): string {
  return value && /^[+\d\s().-]+$/.test(value) ? value : "";
}

export function isCheckoutCompanyComplete(company: Company): boolean {
  return companyProfileSchema.safeParse({ ...company, npwp: company.npwp ?? "" }).success;
}
