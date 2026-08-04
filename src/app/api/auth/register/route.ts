import { NextResponse } from "next/server";

import { setAuthResponseCookies } from "@/features/auth/auth-cookie.response";
import { getAuthRuntimeConfig } from "@/features/auth/auth.config";
import { registerWithSupabase } from "@/features/auth/supabase-auth.service";
import { registerProductionSchema } from "@/features/auth/auth.validation";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "auth.register"),
      limit: 5,
      windowMs: 60_000,
    });
    const config = getAuthRuntimeConfig();
    if (config.provider === "mock") {
      return NextResponse.json(
        { ok: false, code: "MOCK_AUTH_CLIENT", message: "Gunakan mock auth development." },
        { status: 409 },
      );
    }
    const input = validateInput(
      registerProductionSchema,
      await request.json().catch(() => ({})),
    );
    const result = await registerWithSupabase(input);
    const response = NextResponse.json(
      {
        ok: true,
        requiresEmailVerification: result.requiresEmailVerification,
        ...(result.session ?? {}),
      },
      { status: 201 },
    );
    if (result.tokens) {
      setAuthResponseCookies(response, result.tokens, config.mode === "production");
    }
    return response;
  } catch (error) {
    return safeErrorResponse(error, "Pendaftaran belum dapat diproses.", 400);
  }
}
