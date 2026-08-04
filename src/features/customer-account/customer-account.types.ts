import type { Address } from "@/types/account";

export interface CustomerCompanyProfileInput {
  companyName: string;
  industry: string;
  employeeCount: number;
  npwp?: string;
  phone: string;
  picName: string;
  picEmail: string;
  picWhatsapp: string;
}

export interface CustomerAddressInput {
  label: string;
  recipientName: string;
  recipientPhone: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
}

export type CustomerAddress = Address;
