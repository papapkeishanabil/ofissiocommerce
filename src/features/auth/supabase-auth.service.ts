import "server-only";

import { randomUUID } from "node:crypto";

import type { AuthSession as ClientAuthSession, CompanyRole } from "@/types/account";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import { quotationRepository } from "@/features/quotation/quotation.repository";
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

type QuotationRegistrationTarget = {
  quotationId: string;
  companyId: string;
  companyName: string;
};

export type SafeResolvedSession =
  | { kind: "customer"; session: ClientAuthSession }
  | { kind: "internal"; session: InternalAuthSession };

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export async function signInWithSupabase(
  email: string,
  password: string,
  quotationId?: string,
) {
  const config = requireSupabaseAuthConfig();
  const response = await safeFetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: authHeaders(config.anonKey),
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const authError = await readSupabaseAuthError(response);
    if (authError.code === "email_not_confirmed") {
      throw createApiError(
        "FORBIDDEN",
        "Email belum diverifikasi. Buka email verifikasi dari Ofissio, lalu coba masuk kembali.",
        403,
      );
    }
    throw createApiError("UNAUTHORIZED", "Email atau password salah.", 401);
  }
  const payload = (await response.json()) as Record<string, unknown>;
  const tokens = tokensFromPayload(payload);
  const user = authUserFromPayload(payload.user);
  if (!tokens || !user) {
    throw createApiError("UNAUTHORIZED", "Sesi Supabase belum valid.", 401);
  }
  if (config.requireEmailVerification && !user.email_confirmed_at) {
    throw createApiError(
      "FORBIDDEN",
      "Email belum diverifikasi. Buka email verifikasi dari Ofissio, lalu coba masuk kembali.",
      403,
    );
  }
  await repairCustomerRegistration(user, quotationId);
  const session = await resolveSafeSession(user);
  return { tokens, session };
}

export async function registerWithSupabase(input: {
  fullName: string;
  email: string;
  whatsapp: string;
  password: string;
  companyName?: string;
  quotationId?: string;
  emailRedirectTo?: string;
}) {
  const config = requireSupabaseAuthConfig();
  const registrationTarget = await resolveQuotationRegistrationTarget(
    input.quotationId,
    input.email,
  );
  const signupUrl = new URL(`${config.url}/auth/v1/signup`);
  if (input.emailRedirectTo) {
    signupUrl.searchParams.set("redirect_to", input.emailRedirectTo);
  }
  const response = await safeFetch(signupUrl.toString(), {
    method: "POST",
    headers: authHeaders(config.anonKey),
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      data: {
        full_name: input.fullName,
        whatsapp: input.whatsapp,
        company_name: input.companyName || `Perusahaan ${input.fullName}`,
        ...(input.quotationId ? { quotation_id: input.quotationId } : {}),
      },
    }),
  });
  if (!response.ok) {
    const authError = await readSupabaseAuthError(response);
    if (["user_already_exists", "email_exists"].includes(authError.code)) {
      throw createApiError(
        "VALIDATION_ERROR",
        "Email sudah terdaftar. Verifikasi email jika belum, lalu gunakan form Masuk.",
        400,
      );
    }
    throw createApiError(
      "VALIDATION_ERROR",
      "Akun belum dapat dibuat. Periksa email atau gunakan akun yang sudah ada.",
      400,
    );
  }
  const payload = (await response.json()) as Record<string, unknown>;
  const rawUser = asRecord(payload.user);
  if (Array.isArray(rawUser?.identities) && rawUser.identities.length === 0) {
    throw createApiError(
      "VALIDATION_ERROR",
      "Email sudah terdaftar. Verifikasi email jika belum, lalu gunakan form Masuk.",
      400,
    );
  }
  const user = authUserFromPayload(payload.user);
  if (!user) {
    throw createApiError(
      "VALIDATION_ERROR",
      "Email sudah terdaftar. Pilih Masuk dan gunakan password akun Anda.",
      400,
    );
  }

  await createCustomerProfile({
    authUserId: user.id,
    fullName: input.fullName,
    email: input.email,
    whatsapp: input.whatsapp,
    companyName: input.companyName || `Perusahaan ${input.fullName}`,
    registrationTarget,
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
  registrationTarget?: QuotationRegistrationTarget | null;
}) {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw createApiError("PROVIDER_UNAVAILABLE", "Database auth belum siap.", 503);
  }
  const normalizedEmail = input.email.trim().toLowerCase();
  const profiles = await client.select<Record<string, unknown>>("user_profiles", {
    filters: { email: normalizedEmail },
    limit: 1,
  });
  const existingProfile = profiles[0];
  const linkedAuthUserId = nullableString(existingProfile?.auth_user_id);
  if (linkedAuthUserId && linkedAuthUserId !== input.authUserId) {
    throw createApiError(
      "FORBIDDEN",
      "Email sudah terhubung ke akun lain. Silakan masuk dengan akun tersebut.",
      403,
    );
  }

  const profileId = existingProfile ? String(existingProfile.id) : randomUUID();
  const legacyLinks = existingProfile
    ? await client.select<Record<string, unknown>>("company_users", {
        filters: { user_id: profileId },
        limit: 2,
      })
    : [];
  const activeMemberships = await client.select<Record<string, unknown>>(
    "company_memberships",
    { filters: { auth_user_id: input.authUserId, status: "active" }, limit: 2 },
  );
  const companyId =
    input.registrationTarget?.companyId ??
    nullableString(activeMemberships[0]?.company_id) ??
    nullableString(legacyLinks[0]?.company_id) ??
    randomUUID();

  if (
    input.registrationTarget &&
    activeMemberships.some((row) => String(row.company_id) !== companyId)
  ) {
    throw createApiError(
      "FORBIDDEN",
      "Akun sudah terhubung ke perusahaan lain. Hubungi tim Ofissio untuk bantuan akses.",
      403,
    );
  }

  const companies = await client.select<Record<string, unknown>>("companies", {
    filters: { id: companyId },
    limit: 1,
  });
  if (!companies[0]) {
    if (input.registrationTarget) {
      throw createApiError("NOT_FOUND", "Perusahaan quotation tidak ditemukan.", 404);
    }
    await client.insert("companies", {
      id: companyId,
      name: input.companyName,
      legal_name: null,
      industry: null,
      employee_count: null,
      status: "active",
    });
  } else if (nullableString(companies[0].status) !== "active") {
    throw createApiError("FORBIDDEN", "Perusahaan belum aktif.", 403);
  }

  if (existingProfile) {
    await client.update(
      "user_profiles",
      {
        auth_user_id: input.authUserId,
        name: input.fullName,
        whatsapp: input.whatsapp,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { id: profileId },
    );
  } else {
    await client.insert("user_profiles", {
      id: profileId,
      auth_user_id: input.authUserId,
      name: input.fullName,
      email: normalizedEmail,
      whatsapp: input.whatsapp,
      status: "active",
    });
  }

  const membershipRole = legacyRoleToMembershipRole(
    nullableString(
      legacyLinks.find((row) => String(row.company_id) === companyId)?.role,
    ),
  );
  const memberships = await client.select<Record<string, unknown>>("company_memberships", {
    filters: { company_id: companyId, auth_user_id: input.authUserId },
    limit: 1,
  });
  if (memberships[0]) {
    await client.update(
      "company_memberships",
      {
        user_profile_id: profileId,
        role: membershipRole,
        status: "active",
        joined_at: nullableString(memberships[0].joined_at) ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { id: String(memberships[0].id) },
    );
  } else {
    await client.insert("company_memberships", {
      id: randomUUID(),
      company_id: companyId,
      user_profile_id: profileId,
      auth_user_id: input.authUserId,
      role: membershipRole,
      status: "active",
      joined_at: new Date().toISOString(),
    });
  }

  const legacyLink = legacyLinks.find((row) => String(row.company_id) === companyId);
  if (legacyLink) {
    await client.update(
      "company_users",
      { status: "active", updated_at: new Date().toISOString() },
      { id: String(legacyLink.id) },
    );
  } else {
    await client.insert("company_users", {
      id: randomUUID(),
      company_id: companyId,
      user_id: profileId,
      role: membershipRole === "customer_admin" ? "company_admin" : "viewer",
      status: "active",
    });
  }
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
        picName: nullableString(company.pic_name) ?? profileName,
        picEmail: nullableString(company.pic_email) ?? profileEmail,
        picWhatsapp:
          nullableString(company.pic_whatsapp) ??
          nullableString(profile.whatsapp) ??
          "",
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
          isDefaultShipping: Boolean(
            address.is_default_shipping ?? address.is_default,
          ),
          isDefaultBilling: Boolean(
            address.is_default_billing ?? address.is_default,
          ),
        })),
        createdAt: nullableString(company.created_at) ?? now,
        updatedAt: nullableString(company.updated_at) ?? now,
      },
    },
  };
}

async function resolveQuotationRegistrationTarget(
  quotationId: string | undefined,
  email: string,
): Promise<QuotationRegistrationTarget | null> {
  if (!quotationId) return null;
  const quotation = await quotationRepository.getById(quotationId);
  if (!quotation) {
    throw createApiError(
      "NOT_FOUND",
      "Tautan quotation tidak valid atau quotation sudah tidak tersedia.",
      404,
    );
  }
  const normalizedEmail = email.trim().toLowerCase();
  const recipientEmails = [
    quotation.customerEmail,
    quotation.picEmail,
    quotation.userEmail,
  ]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));
  if (!recipientEmails.includes(normalizedEmail)) {
    throw createApiError(
      "FORBIDDEN",
      "Gunakan email penerima quotation untuk membuat akun dan membuka penawaran ini.",
      403,
    );
  }
  const companyId = await ensureQuotationCompany({
    quotationId: quotation.id,
    currentCompanyId: quotation.companyId,
    companyName: quotation.companyName,
  });
  return {
    quotationId: quotation.id,
    companyId,
    companyName: quotation.companyName,
  };
}

async function ensureQuotationCompany(input: {
  quotationId: string;
  currentCompanyId: string;
  companyName: string;
}) {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw createApiError("PROVIDER_UNAVAILABLE", "Database auth belum siap.", 503);
  }

  const currentCompanyId = input.currentCompanyId.trim();
  if (isUuid(currentCompanyId)) {
    const companies = await client.select<Record<string, unknown>>("companies", {
      filters: { id: currentCompanyId },
      limit: 1,
    });
    if (companies[0]) return currentCompanyId;
    await client.insert("companies", {
      id: currentCompanyId,
      name: input.companyName,
      legal_name: null,
      industry: null,
      employee_count: null,
      status: "active",
    });
    return currentCompanyId;
  }

  const companyId = randomUUID();
  await client.insert("companies", {
    id: companyId,
    name: input.companyName,
    legal_name: null,
    industry: null,
    employee_count: null,
    status: "active",
  });
  const updatedQuotation = await quotationRepository.update(input.quotationId, {
    companyId,
  });
  if (!updatedQuotation) {
    throw createApiError(
      "INTERNAL_ERROR",
      "Company quotation belum dapat disiapkan.",
      500,
    );
  }
  return companyId;
}

async function repairCustomerRegistration(
  user: SupabaseAuthUser,
  requestedQuotationId?: string,
) {
  const client = getSupabaseAdminClient();
  if (!client || !user.email) return;
  const profiles = await client.select<Record<string, unknown>>("user_profiles", {
    filters: { auth_user_id: user.id },
    limit: 1,
  });
  if (profiles[0]) return;

  const quotationId =
    requestedQuotationId ??
    nullableString(user.user_metadata?.quotation_id) ??
    (await findUnambiguousQuotationIdForEmail(user.email));
  const registrationTarget =
    quotationId && /^quo_[a-z0-9_-]+$/i.test(quotationId)
      ? await resolveQuotationRegistrationTarget(quotationId, user.email)
      : null;
  const fullName =
    nullableString(user.user_metadata?.full_name) ?? "Customer Ofissio";
  await createCustomerProfile({
    authUserId: user.id,
    fullName,
    email: user.email,
    whatsapp: nullableString(user.user_metadata?.whatsapp) ?? "Belum dilengkapi",
    companyName:
      registrationTarget?.companyName ??
      nullableString(user.user_metadata?.company_name) ??
      `Perusahaan ${fullName}`,
    registrationTarget,
  });
}

async function findUnambiguousQuotationIdForEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const matching = (await quotationRepository.listAll()).filter((quotation) =>
    [quotation.customerEmail, quotation.picEmail, quotation.userEmail].some(
      (value) => value?.trim().toLowerCase() === normalizedEmail,
    ),
  );
  if (matching.length === 0) return null;
  const companyIds = new Set(matching.map((quotation) => quotation.companyId));
  return companyIds.size === 1 ? matching[0]!.id : null;
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

function legacyRoleToMembershipRole(value: string | null) {
  return value === null || value === "company_admin"
    ? "customer_admin"
    : "customer_user";
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function asRecord(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

async function readSupabaseAuthError(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const code = [payload.code, payload.error_code, payload.error]
    .find((value): value is string => typeof value === "string")
    ?.trim()
    .toLowerCase() ?? "unknown";
  return { code };
}

async function safeFetch(input: string, init: RequestInit) {
  try {
    return await fetch(input, { ...init, cache: "no-store" });
  } catch {
    throw createApiError("PROVIDER_UNAVAILABLE", "Supabase Auth belum dapat dihubungi.", 503);
  }
}
