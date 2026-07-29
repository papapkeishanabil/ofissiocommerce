import "server-only";

import {
  assertNoPublicSecretEnv,
  getOptionalServerEnv,
} from "@/lib/security/server-only-secret";

import type { AuthProvider, AuthRuntimeConfig } from "./auth.types";

function normalizeProvider(value: string): AuthProvider {
  return value === "supabase" ? "supabase" : "mock";
}

export function getAuthRuntimeConfig(): AuthRuntimeConfig {
  assertNoPublicSecretEnv(["NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"]);
  const requestedProvider = normalizeProvider(
    getOptionalServerEnv("AUTH_PROVIDER", "mock"),
  );
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

  return {
    requestedProvider,
    provider:
      requestedProvider === "supabase" && supabaseConfigured
        ? "supabase"
        : "mock",
    sessionCookieName: getOptionalServerEnv(
      "AUTH_SESSION_COOKIE_NAME",
      "ofissio_session",
    ),
    supabase: { ...supabase, isConfigured: supabaseConfigured },
  };
}
