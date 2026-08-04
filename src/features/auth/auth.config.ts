import "server-only";

import {
  assertNoPublicSecretEnv,
  getOptionalServerEnv,
} from "@/lib/security/server-only-secret";

import type { AuthMode, AuthProvider, AuthRuntimeConfig } from "./auth.types";

function normalizeProvider(value: string): AuthProvider {
  return value === "supabase" ? "supabase" : "mock";
}

function normalizeMode(value: string): AuthMode {
  return value === "production" ? "production" : "development";
}

function booleanEnv(name: string, fallback = false) {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export function getAuthRuntimeConfig(): AuthRuntimeConfig {
  assertNoPublicSecretEnv(["NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"]);
  const requestedProvider = normalizeProvider(
    getOptionalServerEnv("AUTH_PROVIDER", "mock"),
  );
  const mode = normalizeMode(getOptionalServerEnv("AUTH_MODE", "development"));
  const supabase = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "",
    serviceRoleKeyConfigured: Boolean(
      getOptionalServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
    ),
  };
  const supabaseConfigured = Boolean(
    supabase.url && supabase.anonKey && supabase.serviceRoleKeyConfigured,
  );
  const configurationErrors: string[] = [];
  if (mode === "production" && requestedProvider !== "supabase") {
    configurationErrors.push("AUTH_PROVIDER wajib supabase pada AUTH_MODE=production.");
  }
  if (requestedProvider === "supabase" && !supabaseConfigured) {
    configurationErrors.push("Konfigurasi Supabase Auth belum lengkap.");
  }

  const allowDevelopmentBoundary = mode === "development";
  const adminDevBypass =
    allowDevelopmentBoundary && booleanEnv("ADMIN_DEV_BYPASS", false);
  const internalDevHeadersEnabled =
    allowDevelopmentBoundary &&
    booleanEnv("INTERNAL_DEV_HEADERS_ENABLED", false);

  return {
    requestedProvider,
    provider: requestedProvider,
    mode,
    requireEmailVerification: booleanEnv(
      "AUTH_REQUIRE_EMAIL_VERIFICATION",
      mode === "production",
    ),
    adminDevBypass,
    internalDevHeadersEnabled,
    isProductionSafe: configurationErrors.length === 0,
    configurationErrors,
    sessionCookieName: getOptionalServerEnv(
      "AUTH_SESSION_COOKIE_NAME",
      "ofissio_session",
    ),
    supabase: { ...supabase, isConfigured: supabaseConfigured },
  };
}
