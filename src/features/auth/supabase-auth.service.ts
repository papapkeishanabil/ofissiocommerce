import "server-only";

import { randomUUID } from "node:crypto";

import type { AuthSession as ClientAuthSession, CompanyRole } from "@/types/account";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import { createApiError } from "@/lib/security/safe-error-response";

import { getAuthRuntimeConfig } from "./auth.config";
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
} from "./auth.constants";
import type { InternalAuthSession } from "./auth.types";

type SupabaseAuthUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
};

export type SafeResolvedSession =
  | { kind: "customer"; session: ClientAuthSession }
  | { kind: "internal"; session: InternalAuthSession };

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export async function signInWithSupabase(email: string, password: string) {
  const config = requireSupabaseAuthConfig();
  const response = await safeFetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: authHeaders(config.anonKey),
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw createApiError("UNAUTHORIZED", "Email atau password salah.", 401);
  }
  const payload = (await response.json()) as Record<string, unknown>;
  const tokens = tokensFromPayload(payload);
  const user = authUserFromPayload(payload.user);
  if (!tokens || !user) {
    throw createApiError("UNAUTHORIZED", "Sesi Supabase belum valid.", 401);
  }
  if (config.requireEmailVerification && !user.email_confirmed_at) {
    throw createApiError("FORBIDDEN", "Email belum diverifikasi.", 403);
  }
  const session = await resolveSafeSession(user);
  return { tokens, session };
}

export async function registerWithSupabase(input: {
  fullName: string;
  email: string;
  whatsapp: string;
  password: string;
  companyName?: string;
}) {
  const config = requireSupabaseAuthConfig();
  const response = await safeFetch(`${config.url}/auth/v1/signup`, {
    method: "POST",
    headers: authHeaders(config.anonKey),
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      data: { full_name: input.fullName, whatsapp: input.whatsapp },
    }),
  });
  if (!response.ok) {
    throw createApiError(
      "VALIDATION_ERROR",
      "Akun belum dapat dibuat. Periksa email atau gunakan akun yang sudah ada.",
      400,
    );
  }
  const payload = (await response.json()) as Record<string, unknown>;
  const user = authUserFromPayload(payload.user);
  if (!user) {
    throw createApiError("INTERNAL_ERROR", "Akun Supabase belum tersedia.", 500);
  }

  await createCustomerProfile({
    authUserId: user.id,
    fullName: input.fullName,
    email: input.email,
    whatsapp: input.whatsapp,
    companyName: input.companyName || `Perusahaan ${input.fullName}`,
  });

  const tokens = tokensFromPayload(payload);
  if (!tokens) {
    return { requiresEmailVerification: true, tokens: null, session: null };
  }
  const session = await resolveSafeSession(user);
  return { requiresEmailVerification: false, tokens, session };
}

export async function readSupabaseRequestSession(request: Request) {
  const config = requireSupabaseAuthConfig();
  const accessToken = readCookie(request, AUTH_ACCESS_COOKIE);
  const refreshToken = readCookie(request, AUTH_REFRESH_COOKIE);
  let user = accessToken
    ? await getUserByAccessToken(config.url, config.anonKey, accessToken)
    : null;
  let tokens: AuthTokens | null = null;

  if (!user && refreshToken) {
    tokens = await refreshSession(config.url, config.anonKey, refreshToken);
    user = tokens
      ? await getUserByAccessToken(config.url, config.anonKey, tokens.accessToken)
      : null;
  }
  if (!user) return { session: null, refreshedTokens: tokens };
  if (config.requireEmailVerification && !user.email_confirmed_at) {
    return { session: null, refreshedTokens: tokens };
  }
  return { session: await resolveSafeSession(user), refreshedTokens: tokens };
}

export async function signOutSupabase(request: Request) {
  const config = requireSupabaseAuthConfig();
  const accessToken = readCookie(request, AUTH_ACCESS_COOKIE);
  if (!accessToken) return;
  await safeFetch(`${config.url}/auth/v1/logout`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  }).catch(() => null);
}

async function createCustomerProfile(input: {
  authUserId: string;
  fullName: string;
  email: string;
  whatsapp: string;
  companyName: string;
}) {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw createApiError("PROVIDER_UNAVAILABLE", "Database auth belum siap.", 503);
  }
  const companyId = randomUUID();
  const profileId = randomUUID();
  await client.insert("companies", {
    id: companyId,
    name: input.companyName,
    legal_name: null,
    industry: null,
    employee_count: null,
    status: "active",
  });
  await client.insert("user_profiles", {
    id: profileId,
    auth_user_id: input.authUserId,
    name: input.fullName,
    email: input.email.toLowerCase(),
    whatsapp: input.whatsapp,
    status: "active",
  });
  await client.insert("company_memberships", {
    id: randomUUID(),
    company_id: companyId,
    user_profile_id: profileId,
    auth_user_id: input.authUserId,
    role: "customer_admin",
    status: "active",
  });
  await client.insert("company_users", {
    id: randomUUID(),
    company_id: companyId,
    user_id: profileId,
    role: "company_admin",
    status: "active",
  });
}

async function resolveSafeSession(user: SupabaseAuthUser): Promise<SafeResolvedSession> {
  const client = getSupabaseAdminClient();
  if (!client) throw createApiError("PROVIDER_UNAVAILABLE", "Database auth belum siap.", 503);

  const internal = await client.select<Record<string, unknown>>("internal_user_profiles", {
    filters: { auth_user_id: user.id, status: "active" },
    limit: 1,
  });
  if (internal[0]) {
    const row = internal[0];
    return {
      kind: "internal",
      session: {
        userId: String(row.id ?? user.id),
        email: nullableString(row.email) ?? user.email ?? null,
        name: nullableString(row.name),
        role: normalizeInternalRole(nullableString(row.role)),
        provider: "supabase",
      },
    };
  }

  const profiles = await client.select<Record<string, unknown>>("user_profiles", {
    filters: { auth_user_id: user.id, status: "active" },
    limit: 1,
  });
  const profile = profiles[0];
  if (!profile) throw createApiError("FORBIDDEN", "Profil pengguna belum aktif.", 403);
  const memberships = await client.select<Record<string, unknown>>("company_memberships", {
    filters: { auth_user_id: user.id, status: "active" },
    limit: 1,
  });
  const membership = memberships[0];
  if (!membership) throw createApiError("FORBIDDEN", "Membership company belum aktif.", 403);
  const companies = await client.select<Record<string, unknown>>("companies", {
    filters: { id: String(membership.company_id), status: "active" },
    limit: 1,
  });
  const company = companies[0];
  if (!company) throw createApiError("FORBIDDEN", "Company belum aktif.", 403);
  const addresses = await client.select<Record<string, unknown>>("company_addresses", {
    filters: { company_id: String(company.id) },
    order: "created_at.asc",
  });
  const now = new Date().toISOString();
  const role = normalizeClientRole(nullableString(membership.role));
  const profileName = nullableString(profile.name) ?? "Customer Ofissio";
  const profileEmail = nullableString(profile.email) ?? user.email ?? "";

  return {
    kind: "customer",
    session: {
      user: {
        id: String(profile.id),
        companyId: String(company.id),
        fullName: profileName,
        email: profileEmail,
        whatsapp: nullableString(profile.whatsapp) ?? "",
        role,
        status: "active",
        createdAt: nullableString(profile.created_at) ?? now,
        updatedAt: nullableString(profile.updated_at) ?? now,
      },
      company: {
        id: String(company.id),
        companyName: nullableString(company.name) ?? "Company Ofissio",
        industry: nullableString(company.industry) ?? "",
        employeeCount: Number(company.employee_count ?? 0),
        npwp: nullableString(company.npwp),
        phone: nullableString(company.phone) ?? "",
        picName: profileName,
        picEmail: profileEmail,
        picWhatsapp: nullableString(profile.whatsapp) ?? "",
        profileCompletedAt: nullableString(company.profile_completed_at),
        addresses: addresses.map((address) => ({
          id: String(address.id),
          label: nullableString(address.label) ?? "Alamat",
          recipientName: nullableString(address.recipient_name) ?? profileName,
          recipientPhone: nullableString(address.phone) ?? "",
          street: nullableString(address.address_line) ?? "",
          city: nullableString(address.city) ?? "",
          province: nullableString(address.province) ?? "",
          postalCode: nullableString(address.postal_code) ?? "",
          isDefaultShipping: Boolean(address.is_default),
          isDefaultBilling: Boolean(address.is_default),
        })),
        createdAt: nullableString(company.created_at) ?? now,
        updatedAt: nullableString(company.updated_at) ?? now,
      },
    },
  };
}

async function getUserByAccessToken(url: string, anonKey: string, token: string) {
  const response = await safeFetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  return authUserFromPayload(await response.json());
}

async function refreshSession(url: string, anonKey: string, refreshToken: string) {
  const response = await safeFetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: authHeaders(anonKey),
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) return null;
  return tokensFromPayload((await response.json()) as Record<string, unknown>);
}

function requireSupabaseAuthConfig() {
  const config = getAuthRuntimeConfig();
  if (config.provider !== "supabase" || !config.supabase.isConfigured) {
    throw createApiError("PROVIDER_UNAVAILABLE", "Supabase Auth belum dikonfigurasi.", 503);
  }
  if (config.mode === "production" && !config.isProductionSafe) {
    throw createApiError("PROVIDER_UNAVAILABLE", "Konfigurasi authentication belum aman.", 503);
  }
  return {
    url: config.supabase.url.replace(/\/+$/, ""),
    anonKey: config.supabase.anonKey,
    requireEmailVerification: config.requireEmailVerification,
  };
}

function authHeaders(anonKey: string) {
  return { apikey: anonKey, "Content-Type": "application/json" };
}

function tokensFromPayload(payload: Record<string, unknown>): AuthTokens | null {
  if (
    typeof payload.access_token !== "string" ||
    typeof payload.refresh_token !== "string"
  ) return null;
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresIn: typeof payload.expires_in === "number" ? payload.expires_in : 3600,
  };
}

function authUserFromPayload(value: unknown): SupabaseAuthUser | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string") return null;
  return {
    id: row.id,
    email: typeof row.email === "string" ? row.email : undefined,
    email_confirmed_at:
      typeof row.email_confirmed_at === "string" ? row.email_confirmed_at : null,
    user_metadata:
      row.user_metadata && typeof row.user_metadata === "object"
        ? (row.user_metadata as Record<string, unknown>)
        : undefined,
  };
}

function normalizeClientRole(value: string | null): CompanyRole {
  if (value === "customer_admin" || value === "company_admin") return "customer_admin";
  return "customer_user";
}

function normalizeInternalRole(value: string | null): InternalAuthSession["role"] {
  if (["sales_admin", "production_admin", "finance_admin", "super_admin"].includes(value ?? "")) {
    return value as InternalAuthSession["role"];
  }
  if (value === "sales") return "sales_admin";
  if (value === "finance_internal") return "finance_admin";
  return "support";
}

function readCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  const prefix = `${name}=`;
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length) ?? null;
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function safeFetch(input: string, init: RequestInit) {
  try {
    return await fetch(input, { ...init, cache: "no-store" });
  } catch {
    throw createApiError("PROVIDER_UNAVAILABLE", "Supabase Auth belum dapat dihubungi.", 503);
  }
}
