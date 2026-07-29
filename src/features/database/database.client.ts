import "server-only";

import { DatabaseConfigurationError } from "./database.errors";
import { getDatabaseRuntimeConfig } from "./database.config";

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
 * Placeholder boundary for future Supabase/Postgres clients.
 *
 * Phase 11 intentionally avoids adding a DB SDK or opening a network
 * connection. Repository adapters can call this boundary later after staging
 * credentials and migration workflow are ready.
 */
export function getDatabaseClient() {
  return null;
}
