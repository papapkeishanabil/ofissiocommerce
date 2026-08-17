import { NextResponse } from "next/server";

import { getAuthRuntimeConfig } from "@/features/auth/auth.config";
import { requestSupabasePasswordRecovery } from "@/features/auth/supabase-auth.service";
import { forgotPasswordSchema } from "@/features/auth/auth.validation";
import { logSecurityEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "auth.forgot_password"),
      limit: 3,
      windowMs: 15 * 60_000,
    });
    const config = getAuthRuntimeConfig();
    if (config.provider !== "supabase") {
      return NextResponse.json(
        { ok: false, message: "Pemulihan password hanya tersedia melalui Supabase Auth." },
        { status: 409 },
      );
    }
    const input = validateInput(
      forgotPasswordSchema,
      await request.json().catch(() => ({})),
    );
    await requestSupabasePasswordRecovery(input.email, recoveryRedirectUrl(request));
    logSecurityEvent({
      request,
      action: "auth_password_recovery_requested",
      entityType: "auth_user",
      metadata: { provider: "supabase" },
    });
    return NextResponse.json({
      ok: true,
      message: "Jika email terdaftar, tautan pemulihan akan dikirim.",
    });
  } catch (error) {
    logSecurityEvent({
      request,
      action: "auth_password_recovery_rejected",
      entityType: "auth_user",
      metadata: { reason: "rate_limited_invalid_or_provider_unavailable" },
    });
    return safeErrorResponse(error, "Permintaan pemulihan belum dapat diproses.", 400);
  }
}

function recoveryRedirectUrl(request: Request) {
  const configured = process.env.APP_URL?.trim();
  const base = configured || new URL(request.url).origin;
  return new URL("/reset-password", base).toString();
}
