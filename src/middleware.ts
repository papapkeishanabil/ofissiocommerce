import { NextRequest, NextResponse } from "next/server";

import {
  AUTH_ACCESS_COOKIE,
  AUTH_COOKIE_MAX_AGE_SECONDS,
  AUTH_REFRESH_COOKIE,
  TRUSTED_AUTH_HEADER,
  TRUSTED_AUTH_KIND_HEADER,
  UNTRUSTED_IDENTITY_HEADERS,
} from "@/features/auth/auth.constants";

type Identity =
  | {
      kind: "customer";
      userId: string;
      email: string | null;
      name: string | null;
      companyId: string;
      companyName: string | null;
      role: string;
    }
  | {
      kind: "internal";
      userId: string;
      email: string | null;
      name: string | null;
      role: string;
    };

type RefreshedTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export async function middleware(request: NextRequest) {
  const settings = authSettings();
  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);
  for (const header of UNTRUSTED_IDENTITY_HEADERS) requestHeaders.delete(header);

  if (isAuthEndpoint(pathname) || pathname === "/login") {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (settings.mode === "production" && settings.provider !== "supabase") {
    return denyUnsafeConfiguration(request, pathname);
  }

  let identity: Identity | null = null;
  let refreshedTokens: RefreshedTokens | null = null;

  if (settings.provider === "supabase" && settings.supabaseConfigured) {
    const resolved = await resolveSupabaseIdentity(request, settings);
    identity = resolved.identity;
    refreshedTokens = resolved.refreshedTokens;
  } else if (settings.mode === "development") {
    identity = resolveDevelopmentIdentity(request, settings);
  }

  if (identity) applyIdentityHeaders(requestHeaders, identity);

  if (isAdminPath(pathname) && identity?.kind !== "internal") {
    return unauthorizedResponse(request, pathname, true);
  }
  if (isProtectedCustomerPage(pathname) && identity?.kind !== "customer") {
    return unauthorizedResponse(request, pathname, false);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (refreshedTokens) setAuthCookies(response, refreshedTokens, settings.mode, request);
  return response;
}

function authSettings() {
  const mode = process.env.AUTH_MODE === "production" ? "production" : "development";
  const provider = process.env.AUTH_PROVIDER === "supabase" ? "supabase" : "mock";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  return {
    mode,
    provider,
    url: url.replace(/\/+$/, ""),
    anonKey,
    serviceRoleKey,
    supabaseConfigured: Boolean(url && anonKey && serviceRoleKey),
    internalHeadersEnabled:
      mode === "development" && process.env.INTERNAL_DEV_HEADERS_ENABLED === "true",
    adminDevBypass:
      mode === "development" && process.env.ADMIN_DEV_BYPASS === "true",
  } as const;
}

function resolveDevelopmentIdentity(
  request: NextRequest,
  settings: ReturnType<typeof authSettings>,
): Identity | null {
  const internalRole = request.headers.get("x-ofissio-internal-role")?.trim();
  if (settings.internalHeadersEnabled && internalRole) {
    return {
      kind: "internal",
      userId: request.headers.get("x-ofissio-internal-user-id")?.trim() || "internal-dev",
      email: null,
      name:
        request.headers.get("x-ofissio-internal-user-name")?.trim() ||
        "Ofissio Internal Dev",
      role: internalRole,
    };
  }
  if (settings.adminDevBypass && isAdminPath(request.nextUrl.pathname)) {
    return {
      kind: "internal",
      userId: "internal-dev",
      email: null,
      name: "Ofissio Internal Dev",
      role: "super_admin",
    };
  }
  if (!settings.internalHeadersEnabled) return null;
  const userId = request.headers.get("x-ofissio-user-id")?.trim();
  const companyId = request.headers.get("x-ofissio-company-id")?.trim();
  if (!userId || !companyId) return null;
  return {
    kind: "customer",
    userId,
    companyId,
    email: request.headers.get("x-ofissio-user-email")?.trim() || null,
    name: request.headers.get("x-ofissio-user-name")?.trim() || null,
    companyName: request.headers.get("x-ofissio-company-name")?.trim() || null,
    role: request.headers.get("x-ofissio-role")?.trim() || "customer_admin",
  };
}

async function resolveSupabaseIdentity(
  request: NextRequest,
  settings: ReturnType<typeof authSettings>,
) {
  if (!settings.supabaseConfigured) {
    return { identity: null, refreshedTokens: null };
  }

  let accessToken = request.cookies.get(AUTH_ACCESS_COOKIE)?.value ?? "";
  const refreshToken = request.cookies.get(AUTH_REFRESH_COOKIE)?.value ?? "";
  let refreshedTokens: RefreshedTokens | null = null;
  let user = accessToken
    ? await getSupabaseUser(settings.url, settings.anonKey, accessToken)
    : null;

  if (!user && refreshToken) {
    refreshedTokens = await refreshSupabaseSession(
      settings.url,
      settings.anonKey,
      refreshToken,
    );
    if (refreshedTokens) {
      accessToken = refreshedTokens.accessToken;
      user = await getSupabaseUser(settings.url, settings.anonKey, accessToken);
    }
  }
  if (!user) return { identity: null, refreshedTokens };

  const identity = await getDatabaseIdentity(settings, user);
  return { identity, refreshedTokens };
}

async function getSupabaseUser(url: string, anonKey: string, accessToken: string) {
  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      id?: unknown;
      email?: unknown;
      email_confirmed_at?: unknown;
      user_metadata?: Record<string, unknown>;
    };
    if (typeof payload.id !== "string") return null;
    return payload;
  } catch {
    return null;
  }
}

async function refreshSupabaseSession(
  url: string,
  anonKey: string,
  refreshToken: string,
): Promise<RefreshedTokens | null> {
  try {
    const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as Record<string, unknown>;
    if (
      typeof payload.access_token !== "string" ||
      typeof payload.refresh_token !== "string"
    ) {
      return null;
    }
    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      expiresIn:
        typeof payload.expires_in === "number" ? payload.expires_in : 3600,
    };
  } catch {
    return null;
  }
}

async function getDatabaseIdentity(
  settings: ReturnType<typeof authSettings>,
  user: { id?: unknown; email?: unknown; user_metadata?: Record<string, unknown> },
): Promise<Identity | null> {
  const authUserId = String(user.id);
  const internal = await selectOne(settings, "internal_user_profiles", {
    select: "id,auth_user_id,name,email,role,status",
    auth_user_id: `eq.${authUserId}`,
    status: "eq.active",
  });
  if (internal && typeof internal.role === "string") {
    return {
      kind: "internal",
      userId: String(internal.id ?? authUserId),
      email: nullableString(internal.email) ?? nullableString(user.email),
      name: nullableString(internal.name),
      role: internal.role,
    };
  }

  const profile = await selectOne(settings, "user_profiles", {
    select: "id,auth_user_id,name,email,whatsapp,status",
    auth_user_id: `eq.${authUserId}`,
    status: "eq.active",
  });
  if (!profile) return null;

  let membership = await selectOne(settings, "company_memberships", {
    select: "id,company_id,user_profile_id,auth_user_id,role,status",
    auth_user_id: `eq.${authUserId}`,
    status: "eq.active",
  });
  if (!membership) {
    membership = await selectOne(settings, "company_users", {
      select: "id,company_id,user_id,role,status",
      user_id: `eq.${String(profile.id)}`,
      status: "eq.active",
    });
  }
  if (!membership?.company_id) return null;
  const company = await selectOne(settings, "companies", {
    select: "id,name,status",
    id: `eq.${String(membership.company_id)}`,
    status: "eq.active",
  });
  if (!company) return null;

  return {
    kind: "customer",
    userId: String(profile.id),
    email: nullableString(profile.email) ?? nullableString(user.email),
    name:
      nullableString(profile.name) ??
      nullableString(user.user_metadata?.full_name),
    companyId: String(company.id),
    companyName: nullableString(company.name),
    role: normalizeCustomerRole(nullableString(membership.role)),
  };
}

async function selectOne(
  settings: ReturnType<typeof authSettings>,
  table: string,
  query: Record<string, string>,
) {
  const params = new URLSearchParams({ ...query, limit: "1" });
  try {
    const response = await fetch(`${settings.url}/rest/v1/${table}?${params}`, {
      headers: {
        apikey: settings.serviceRoleKey,
        Authorization: `Bearer ${settings.serviceRoleKey}`,
      },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const rows = (await response.json()) as Array<Record<string, unknown>>;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

function normalizeCustomerRole(value: string | null) {
  if (value === "company_admin") return "customer_admin";
  if (["purchasing", "approver", "finance", "viewer"].includes(value ?? "")) {
    return "customer_user";
  }
  return value === "customer_admin" ? value : "customer_user";
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function applyIdentityHeaders(headers: Headers, identity: Identity) {
  headers.set(TRUSTED_AUTH_HEADER, "1");
  headers.set(TRUSTED_AUTH_KIND_HEADER, identity.kind);
  if (identity.kind === "internal") {
    headers.set("x-ofissio-internal-user-id", identity.userId);
    headers.set("x-ofissio-internal-role", identity.role);
    if (identity.name) headers.set("x-ofissio-internal-user-name", identity.name);
    return;
  }
  headers.set("x-ofissio-user-id", identity.userId);
  headers.set("x-ofissio-company-id", identity.companyId);
  headers.set("x-ofissio-role", identity.role);
  if (identity.email) headers.set("x-ofissio-user-email", identity.email);
  if (identity.name) headers.set("x-ofissio-user-name", identity.name);
  if (identity.companyName) headers.set("x-ofissio-company-name", identity.companyName);
}

function setAuthCookies(
  response: NextResponse,
  tokens: RefreshedTokens,
  mode: "development" | "production",
  request: NextRequest,
) {
  // Cookie `Secure` hanya aktif saat request lewat HTTPS; akses HTTP LAN tetap
  // berfungsi (browser membuang cookie Secure pada HTTP non-localhost).
  let requestIsHttps = false;
  try {
    requestIsHttps = new URL(request.url).protocol === "https:";
  } catch {
    requestIsHttps = false;
  }
  const secure = mode === "production" && requestIsHttps;
  const common = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
  };
  response.cookies.set(AUTH_ACCESS_COOKIE, tokens.accessToken, {
    ...common,
    maxAge: Math.max(60, tokens.expiresIn),
  });
  response.cookies.set(AUTH_REFRESH_COOKIE, tokens.refreshToken, {
    ...common,
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });
}

function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/");
}

function isProtectedCustomerPage(pathname: string) {
  return ["/dashboard", "/orders", "/quotes", "/checkout"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isAuthEndpoint(pathname: string) {
  return pathname === "/api/auth" || pathname.startsWith("/api/auth/");
}

function unauthorizedResponse(request: NextRequest, pathname: string, admin: boolean) {
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED", message: "Sesi pengguna belum valid." },
      { status: 401 },
    );
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  if (admin) login.searchParams.set("mode", "admin");
  return NextResponse.redirect(login);
}

function denyUnsafeConfiguration(request: NextRequest, pathname: string) {
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, error: "AUTH_CONFIGURATION", message: "Authentication belum siap." },
      { status: 503 },
    );
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("error", "auth_configuration");
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/orders/:path*",
    "/quotes/:path*",
    "/checkout/:path*",
    "/login",
    "/api/:path*",
  ],
};
