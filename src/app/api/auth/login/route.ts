import { NextResponse } from "next/server";

import { setAuthResponseCookies } from "@/features/auth/auth-cookie.response";
import { getAuthRuntimeConfig } from "@/features/auth/auth.config";
import { signInWithSupabase } from "@/features/auth/supabase-auth.service";
import { signInPlaceholderSchema } from "@/features/auth/auth.validation";
import { logSecurityEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "auth.login"),
      limit: 10,
      windowMs: 60_000,
    });
    const config = getAuthRuntimeConfig();
    if (config.provider === "mock") {
      return NextResponse.json(
        { ok: false, code: "MOCK_AUTH_CLIENT", message: "Gunakan mock auth development." },
        { status: 409 },
      );
    }
    const payload = validateInput(
      signInPlaceholderSchema,
      await request.json().catch(() => ({})),
    );
    const result = await signInWithSupabase(
      payload.email,
      payload.password,
      payload.quotationId,
    );
    logSecurityEvent({
      request,
      action: "auth_login_succeeded",
      entityType: "auth_session",
      metadata: { sessionKind: result.session.kind, provider: config.provider },
    });
    const response = NextResponse.json({ ok: true, ...result.session });
    setAuthResponseCookies(response, result.tokens, config.mode === "production", request);
    return response;
  } catch (error) {
    logSecurityEvent({
      request,
      action: "auth_login_rejected",
      entityType: "auth_session",
      metadata: { reason: "invalid_credentials_or_session" },
    });
    return safeErrorResponse(error, "Login belum dapat diproses.", 401);
  }
}
