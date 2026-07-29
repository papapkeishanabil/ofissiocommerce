import "server-only";

import { getDatabaseRuntimeConfig } from "./database.config";
import type { DatabaseHealth } from "./database.types";

export async function getDatabaseHealth(): Promise<DatabaseHealth> {
  const config = getDatabaseRuntimeConfig();
  const isMock = config.provider === "mock";
  return {
    ok: isMock || config.isConfigured,
    provider: config.provider,
    requestedProvider: config.requestedProvider,
    configured: config.isConfigured,
    message: isMock
      ? "Database provider mock aktif; koneksi eksternal tidak dicek."
      : "Database env terdeteksi. Koneksi live belum dibuka pada Phase 11.",
    checkedAt: new Date().toISOString(),
  };
}
