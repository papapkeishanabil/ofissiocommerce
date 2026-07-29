import "server-only";

import {
  assertNoPublicSecretEnv,
  getOptionalServerEnv,
} from "@/lib/security/server-only-secret";

import type { DatabaseProvider, DatabaseRuntimeConfig } from "./database.types";

function normalizeProvider(value: string): DatabaseProvider {
  return value === "supabase" || value === "postgres" ? value : "mock";
}

export function getDatabaseRuntimeConfig(): DatabaseRuntimeConfig {
  assertNoPublicSecretEnv(["NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"]);

  const requestedProvider = normalizeProvider(
    getOptionalServerEnv("DATABASE_PROVIDER", "mock"),
  );
  const databaseUrl = getOptionalServerEnv("DATABASE_URL");
  const supabase = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "",
    serviceRoleKey: getOptionalServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
  const supabaseConfigured = Boolean(
    supabase.url && supabase.anonKey && supabase.serviceRoleKey,
  );
  const postgresConfigured = Boolean(databaseUrl);
  const isConfigured =
    requestedProvider === "supabase"
      ? supabaseConfigured
      : requestedProvider === "postgres"
        ? postgresConfigured
        : true;

  return {
    requestedProvider,
    provider: isConfigured ? requestedProvider : "mock",
    isConfigured,
    databaseUrl,
    supabase: { ...supabase, isConfigured: supabaseConfigured },
  };
}
