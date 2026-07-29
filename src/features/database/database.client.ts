import "server-only";

import { DatabaseConfigurationError } from "./database.errors";
import { getDatabaseRuntimeConfig } from "./database.config";
import { getSupabaseAdminClient } from "./supabase-admin.client";

export function getDatabaseClientInfo() {
  const config = getDatabaseRuntimeConfig();
  return {
    provider: config.provider,
    requestedProvider: config.requestedProvider,
    configured: config.isConfigured,
    isDatabaseBacked: config.provider !== "mock",
  };
}

export function assertDatabaseReady() {
  const config = getDatabaseRuntimeConfig();
  if (config.provider === "mock") return config;
  if (!config.isConfigured) {
    throw new DatabaseConfigurationError(
      `${config.requestedProvider} database env belum lengkap.`,
    );
  }
  return config;
}

/**
 * Server-only database client boundary. Supabase uses a minimal PostgREST
 * wrapper to avoid adding client SDK code to browser bundles.
 */
export function getDatabaseClient() {
  const config = getDatabaseRuntimeConfig();
  if (config.provider === "supabase") return getSupabaseAdminClient();
  return null;
}
