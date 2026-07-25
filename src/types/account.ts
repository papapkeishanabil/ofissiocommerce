// src/types/account.ts
// Domain models for customer account, company, roles, address.
// Phase 6 (admin) will extend this with full RBAC UI; Phase 2 keeps the
// structure but only `company_admin` (first registrar) is auto-assigned.

export const COMPANY_ROLES = [
  "company_admin",
  "purchasing",
  "approver",
  "finance",
  "viewer",
] as const;

export type CompanyRole = (typeof COMPANY_ROLES)[number];

export function roleLabel(role: CompanyRole): string {
  switch (role) {
    case "company_admin":
      return "Admin Perusahaan";
    case "purchasing":
      return "Purchasing";
    case "approver":
      return "Approver";
    case "finance":
      return "Finance";
    case "viewer":
      return "Viewer";
  }
}

export interface Address {
  id: string;
  label: string; // "Kantor Pusat", "Gudang", dll
  recipientName: string;
  recipientPhone: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
}

export interface Company {
  id: string;
  companyName: string;
  industry: string;
  employeeCount: number;
  npwp?: string | null;
  phone: string;
  /** Person in charge */
  picName: string;
  picEmail: string;
  picWhatsapp: string;
  /** "profile_completed_at" — null means profile still incomplete */
  profileCompletedAt: string | null;
  addresses: Address[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  companyId: string;
  fullName: string;
  email: string;
  /** masked only; never log raw */
  whatsapp: string;
  role: CompanyRole;
  status: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: User;
  company: Company;
}

export function isCompanyProfileComplete(c: Company): boolean {
  return (
    !!c.companyName &&
    !!c.industry &&
    c.employeeCount > 0 &&
    !!c.phone &&
    !!c.picName &&
    !!c.picEmail &&
    !!c.picWhatsapp &&
    !!c.profileCompletedAt &&
    c.addresses.some((a) => a.isDefaultShipping)
  );
}
