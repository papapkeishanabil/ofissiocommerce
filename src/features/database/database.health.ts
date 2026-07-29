import "server-only";

import { getDatabaseRuntimeConfig } from "./database.config";
import type { DatabaseHealth } from "./database.types";

export async function getDatabaseHealth(): Promise<DatabaseHealth> {
  const config = getDatabaseRuntimeConfig();
  const isMock = config.provider === "mock";
  if (isMock) {
    return {
      ok: true,
      provider: config.provider,
      requestedProvider: config.requestedProvider,
      status: "mock",
      configured: config.isConfigured,
      message: "Database provider mock aktif; koneksi eksternal tidak dicek.",
      checkedAt: new Date().toISOString(),
    };
  }

  try {
    if (config.provider === "supabase") {
      const client = (await import("./supabase-admin.client")).getSupabaseAdminClient();
      if (!client) throw new Error("Supabase client unavailable.");
      await client.healthCheck();
      return {
        ok: true,
        provider: config.provider,
        requestedProvider: config.requestedProvider,
        status: "connected",
        configured: config.isConfigured,
        message: "Supabase database reachable.",
        checkedAt: new Date().toISOString(),
      };
    }
  } catch {
    return {
      ok: false,
      provider: config.provider,
      requestedProvider: config.requestedProvider,
      status: "unavailable",
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
    configured: config.isConfigured,
    message: "Database env terdeteksi. Provider ini masih foundation.",
    checkedAt: new Date().toISOString(),
  };
}
