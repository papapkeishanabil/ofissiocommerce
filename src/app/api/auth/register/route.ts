import { NextResponse } from "next/server";

import { setAuthResponseCookies } from "@/features/auth/auth-cookie.response";
import { getAuthRuntimeConfig } from "@/features/auth/auth.config";
import { registerWithSupabase } from "@/features/auth/supabase-auth.service";
import { registerProductionSchema } from "@/features/auth/auth.validation";
import { logSecurityEvent } from "@/lib/security/audit-log";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const nativeFormSubmission = request.headers
    .get("content-type")
    ?.includes("application/x-www-form-urlencoded") ?? false;
  let quotationId: string | undefined;
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
    const rawInput = nativeFormSubmission
      ? Object.fromEntries(await request.formData())
      : await request.json().catch(() => ({}));
    const input = validateInput(registerProductionSchema, rawInput);
    quotationId = input.quotationId;
    const result = await registerWithSupabase({
      ...input,
      emailRedirectTo: buildEmailRedirectUrl(request, input.quotationId),
    });
    logSecurityEvent({
      request,
      action: "auth_registration_succeeded",
      entityType: "auth_user",
      metadata: {
        requiresEmailVerification: result.requiresEmailVerification,
        quotationLinked: Boolean(quotationId),
      },
    });
    const response = nativeFormSubmission
      ? NextResponse.redirect(
          buildLoginRedirectUrl({
            quotationId,
            requiresEmailVerification: result.requiresEmailVerification,
          }),
          { status: 303 },
        )
      : NextResponse.json(
          {
            ok: true,
            requiresEmailVerification: result.requiresEmailVerification,
            ...(result.session ?? {}),
          },
          { status: 201 },
        );
    if (result.tokens) {
      setAuthResponseCookies(response, result.tokens, config.mode === "production", request);
    }
    return response;
  } catch (error) {
    logSecurityEvent({
      request,
      action: "auth_registration_rejected",
      entityType: "auth_user",
      metadata: { reason: "invalid_or_unavailable_registration" },
    });
    if (nativeFormSubmission) {
      return NextResponse.redirect(
        buildLoginRedirectUrl({ quotationId, registrationError: true }),
        { status: 303 },
      );
    }
    return safeErrorResponse(error, "Pendaftaran belum dapat diproses.", 400);
  }
}

function buildEmailRedirectUrl(request: Request, quotationId?: string) {
  const baseUrl = resolvePublicBaseUrl(request);
  try {
    const url = new URL("/login", baseUrl);
    url.searchParams.set("verified", "1");
    url.searchParams.set("next", quotationId ? `/quotes/${quotationId}` : "/dashboard");
    return url.toString();
  } catch {
    return undefined;
  }
}

function resolvePublicBaseUrl(request: Request) {
  const configuredBaseUrl = process.env.APP_URL?.trim();
  if (configuredBaseUrl) return configuredBaseUrl;

  if (process.env.NODE_ENV !== "production") {
    try {
      const requestUrl = new URL(request.url);
      if (["localhost", "127.0.0.1", "[::1]"].includes(requestUrl.hostname)) {
        return requestUrl.origin;
      }
    } catch {
      // Use the known local development origin below.
    }
  }

  return "http://localhost:8000";
}

function buildLoginRedirectUrl(input: {
  quotationId?: string;
  requiresEmailVerification?: boolean;
  registrationError?: boolean;
}) {
  const baseUrl = process.env.APP_URL?.trim() || "http://localhost:8000";
  const url = new URL("/login", baseUrl);
  url.searchParams.set(
    "next",
    input.quotationId ? `/quotes/${input.quotationId}` : "/dashboard",
  );
  if (input.requiresEmailVerification) {
    url.searchParams.set("registered", "verification-required");
  }
  if (input.registrationError) {
    url.searchParams.set("error", "registration-failed");
  }
  return url;
}
