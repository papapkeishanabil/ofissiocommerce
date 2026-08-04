import { NextResponse } from "next/server";

import { setAuthResponseCookies } from "@/features/auth/auth-cookie.response";
import { getAuthRuntimeConfig } from "@/features/auth/auth.config";
import { readSupabaseRequestSession } from "@/features/auth/supabase-auth.service";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const config = getAuthRuntimeConfig();
    if (config.provider === "mock") {
      return NextResponse.json({ ok: true, provider: "mock", session: null });
    }
    const result = await readSupabaseRequestSession(request);
    const response = NextResponse.json({
      ok: true,
      provider: "supabase",
      session: result.session,
    });
    if (result.refreshedTokens) {
      setAuthResponseCookies(
        response,
        result.refreshedTokens,
        config.mode === "production",
        request,
      );
    }
    return response;
  } catch (error) {
    return safeErrorResponse(error, "Sesi belum dapat dibaca.", 401);
  }
}
