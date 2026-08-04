import type {
  CustomerPermission,
  CustomerRole,
} from "@/lib/security/security.types";

export type AuthProvider = "mock" | "supabase";
export type AuthMode = "development" | "production";

export interface AuthRuntimeConfig {
  requestedProvider: AuthProvider;
  provider: AuthProvider;
  mode: AuthMode;
  requireEmailVerification: boolean;
  adminDevBypass: boolean;
  internalDevHeadersEnabled: boolean;
  isProductionSafe: boolean;
  configurationErrors: string[];
  sessionCookieName: string;
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKeyConfigured: boolean;
    isConfigured: boolean;
  };
}

export interface AuthSession {
  userId: string;
  email: string | null;
  name: string | null;
  companyId: string;
  companyName: string | null;
  role: CustomerRole;
  provider: AuthProvider;
}

export interface InternalAuthSession {
  userId: string;
  email: string | null;
  name: string | null;
  role: import("@/lib/security/security.types").InternalRole;
  provider: AuthProvider;
}

export interface AuthSessionHint {
  companyId?: string | null;
  companyName?: string | null;
  userId?: string | null;
  email?: string | null;
  name?: string | null;
  role?: string | null;
}

export interface AuthProviderAdapter {
  name: AuthProvider;
  getCurrentSession(
    request?: Request,
    hint?: AuthSessionHint,
  ): Promise<AuthSession | null> | AuthSession | null;
  signInPlaceholder?(): Promise<never> | never;
  signOutPlaceholder?(): Promise<never> | never;
}

export interface CompanyUserRole {
  companyId: string;
  userId: string;
  role: CustomerRole;
  permissions: CustomerPermission[];
}
