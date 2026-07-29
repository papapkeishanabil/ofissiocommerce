import { NextResponse } from "next/server";

import { getAuthRuntimeConfig } from "@/features/auth/auth.config";
import { getDatabaseHealth } from "@/features/database/database.health";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [database, auth] = await Promise.all([
      getDatabaseHealth(),
      Promise.resolve(getAuthRuntimeConfig()),
    ]);

    return NextResponse.json({
      status: "ok",
      app: "ofissio",
      databaseProvider: database.provider,
      requestedDatabaseProvider: database.requestedProvider,
      databaseConfigured: database.configured,
      authProvider: auth.provider,
      requestedAuthProvider: auth.requestedProvider,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return safeErrorResponse(error, "Health check belum tersedia.", 503);
  }
}
