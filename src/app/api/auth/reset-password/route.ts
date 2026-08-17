import { NextResponse } from "next/server";

import { updateSupabasePassword } from "@/features/auth/supabase-auth.service";
import { resetPasswordSchema } from "@/features/auth/auth.validation";
import { logSecurityEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "auth.reset_password"),
      limit: 5,
      windowMs: 15 * 60_000,
    });
    const authorization = request.headers.get("authorization") ?? "";
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";
    if (!token || token.length > 4096) {
      throw createApiError("UNAUTHORIZED", "Tautan pemulihan tidak valid.", 401);
    }
    const input = validateInput(
      resetPasswordSchema,
      await request.json().catch(() => ({})),
    );
    await updateSupabasePassword(token, input.password);
    logSecurityEvent({
      request,
      action: "auth_password_reset_succeeded",
      entityType: "auth_user",
      metadata: { provider: "supabase" },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logSecurityEvent({
      request,
      action: "auth_password_reset_rejected",
      entityType: "auth_user",
      metadata: { reason: "invalid_expired_or_rate_limited" },
    });
    return safeErrorResponse(error, "Password belum dapat diperbarui.", 400);
  }
}
