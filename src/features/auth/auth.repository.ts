import type { CustomerRole } from "@/lib/security/security.types";

export interface PersistedCompany {
  id: string;
  name: string;
  legalName: string | null;
  industry: string | null;
  employeeCount: number | null;
  status: "active" | "inactive" | "suspended";
}

export interface PersistedUserProfile {
  id: string;
  authUserId: string | null;
  name: string;
  email: string;
  whatsapp: string | null;
  status: "active" | "inactive" | "invited";
}

export interface PersistedCompanyUser {
  id: string;
  companyId: string;
  userId: string;
  role: CustomerRole;
  status: "active" | "inactive" | "invited";
}

export interface AuthRepository {
  getUserProfileByAuthId(authUserId: string): Promise<PersistedUserProfile | null>;
  getCompanyUser(input: {
    companyId: string;
    userId: string;
  }): Promise<PersistedCompanyUser | null>;
  listCompanyUsers(companyId: string): Promise<PersistedCompanyUser[]>;
  getCompanyById(companyId: string): Promise<PersistedCompany | null>;
}

export const mockAuthRepository: AuthRepository = {
  async getUserProfileByAuthId() {
    return null;
  },
  async getCompanyUser() {
    return null;
  },
  async listCompanyUsers() {
    return [];
  },
  async getCompanyById() {
    return null;
  },
};
