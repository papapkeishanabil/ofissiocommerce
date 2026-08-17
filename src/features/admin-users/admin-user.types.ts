import type { InternalRole } from "@/lib/security/security.types";

export type ManagedInternalRole = "sales_admin" | "support" | "sales";
export type InternalUserStatus = "active" | "inactive" | "invited";

export interface ManagedInternalUser {
  id: string;
  authUserId: string;
  name: string;
  email: string;
  role: InternalRole;
  status: InternalUserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const MANAGED_ROLE_OPTIONS: Array<{
  value: ManagedInternalRole;
  label: string;
  responsibility: string;
  routes: string;
}> = [
  {
    value: "sales_admin",
    label: "Admin Ofissio",
    responsibility: "Transaksi katalog, Ready Stock, dan Custom/Bordir.",
    routes: "STK & CUS",
  },
  {
    value: "support",
    label: "Customer Care Ofissio",
    responsibility: "FAQ umum, pemeliharaan Knowledge Base, dan bantuan customer non-transaksi.",
    routes: "Customer Care",
  },
  {
    value: "sales",
    label: "CS Full Custom Ofissio",
    responsibility: "Konsultasi Full Custom/Production, desain, logo, dan spesifikasi teknis.",
    routes: "PRO",
  },
];
