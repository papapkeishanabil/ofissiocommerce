import { NextResponse } from "next/server";

import { getAuthRuntimeConfig } from "@/features/auth/auth.config";
import { getDatabaseHealth } from "@/features/database/database.health";
import { getEmailRuntimeConfig } from "@/features/email/email.config";
import { getStorageRuntimeConfig } from "@/features/storage/storage.config";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [database, auth, storage, email] = await Promise.all([
      getDatabaseHealth(),
      Promise.resolve(getAuthRuntimeConfig()),
      Promise.resolve(getStorageRuntimeConfig()),
      Promise.resolve(getEmailRuntimeConfig()),
    ]);

    return NextResponse.json({
      status: "ok",
      app: "ofissio",
      databaseProvider: database.provider,
      requestedDatabaseProvider: database.requestedProvider,
      databaseStatus: database.status,
      databaseConfigured: database.configured,
      schemaStatus: database.schemaStatus,
      missingTables: database.missingTables,
      authProvider: auth.provider,
      requestedAuthProvider: auth.requestedProvider,
      storageProvider: storage.provider,
      requestedStorageProvider: storage.requestedProvider,
      storageConfigured: storage.provider === "mock" || storage.supabaseConfigured,
      emailProvider: email.provider,
      requestedEmailProvider: email.requestedProvider,
      emailEnabled: email.enabled,
      resendConfigured: email.resendConfigured,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return safeErrorResponse(error, "Health check belum tersedia.", 503);
  }
}
