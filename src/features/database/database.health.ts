import "server-only";

import { getDatabaseRuntimeConfig } from "./database.config";
import { SupabaseDatabaseError } from "./database.errors";
import { REQUIRED_SUPABASE_TABLES } from "./supabase-schema";
import type { DatabaseHealth } from "./database.types";
import { logInternalError } from "@/lib/security/safe-error-response";

export async function getDatabaseHealth(): Promise<DatabaseHealth> {
  const config = getDatabaseRuntimeConfig();
  const isMock = config.provider === "mock";
  if (isMock) {
    return {
      ok: true,
      provider: config.provider,
      requestedProvider: config.requestedProvider,
      status: "mock",
      schemaStatus: "skipped",
      missingTables: [],
      configured: config.isConfigured,
      message: "Database provider mock aktif; koneksi eksternal tidak dicek.",
      checkedAt: new Date().toISOString(),
    };
  }

  try {
    if (config.provider === "supabase") {
      const client = (await import("./supabase-admin.client")).getSupabaseAdminClient();
      if (!client) throw new Error("Supabase client unavailable.");
      const schema = await client.checkSchema(REQUIRED_SUPABASE_TABLES);
      return {
        ok: schema.ok,
        provider: config.provider,
        requestedProvider: config.requestedProvider,
        status: "connected",
        schemaStatus: schema.status,
        missingTables: schema.missingTables,
        configured: config.isConfigured,
        message: schema.ok
          ? "Supabase database reachable dan schema siap."
          : "Supabase database reachable, tetapi schema belum lengkap.",
        checkedAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    logInternalError(error, {
      area: "database_health",
      provider: config.provider,
      reason:
        error instanceof SupabaseDatabaseError
          ? error.reason
          : "query_error",
      status: error instanceof SupabaseDatabaseError ? error.status : undefined,
      code: error instanceof SupabaseDatabaseError ? error.code : undefined,
      table: error instanceof SupabaseDatabaseError ? error.table : undefined,
    });
    return {
      ok: false,
      provider: config.provider,
      requestedProvider: config.requestedProvider,
      status: "unavailable",
      schemaStatus: "unavailable",
      missingTables: [],
      configured: config.isConfigured,
      message: "Database Supabase belum dapat dihubungi.",
      checkedAt: new Date().toISOString(),
    };
  }

  return {
    ok: config.isConfigured,
    provider: config.provider,
    requestedProvider: config.requestedProvider,
    status: config.isConfigured ? "connected" : "unavailable",
    schemaStatus: "skipped",
    missingTables: [],
    configured: config.isConfigured,
    message: "Database env terdeteksi. Provider ini masih foundation.",
    checkedAt: new Date().toISOString(),
  };
}
