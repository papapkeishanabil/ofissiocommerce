import "server-only";

import { NextResponse } from "next/server";

import { logSecurityEvent } from "./audit-log";
import { SecurityApiError, type ApiErrorCode } from "./security.types";

const DEFAULT_MESSAGES: Record<ApiErrorCode, string> = {
  BAD_REQUEST: "Permintaan tidak valid.",
  UNAUTHORIZED: "Sesi tidak valid. Silakan masuk kembali.",
  FORBIDDEN: "Anda tidak memiliki akses ke data ini.",
  NOT_FOUND: "Data tidak ditemukan.",
  RATE_LIMITED: "Terlalu banyak percobaan. Silakan coba lagi sebentar lagi.",
  VALIDATION_ERROR: "Data yang dikirim belum valid.",
  PROVIDER_UNAVAILABLE: "Layanan sedang tidak tersedia. Silakan coba lagi.",
  INTERNAL_ERROR: "Terjadi kendala sistem. Silakan coba lagi.",
};

export function createApiError(
  code: ApiErrorCode,
  publicMessage = DEFAULT_MESSAGES[code],
  status = statusForCode(code),
  metadata: Record<string, unknown> = {},
) {
  return new SecurityApiError(code, publicMessage, status, metadata);
}

export function createValidationError(publicMessage = DEFAULT_MESSAGES.VALIDATION_ERROR) {
  return createApiError("VALIDATION_ERROR", publicMessage, 400);
}

export function toPublicErrorMessage(error: unknown) {
  if (error instanceof SecurityApiError) return error.publicMessage;
  return DEFAULT_MESSAGES.INTERNAL_ERROR;
}

export function logInternalError(
  error: unknown,
  context: Record<string, unknown> = {},
) {
  const safeMessage =
    error instanceof Error ? redactSensitive(error.message) : "Unknown error";
  console.warn("[ofissio.security]", {
    ...context,
    error: safeMessage,
  });
}

export function safeErrorResponse(
  error: unknown,
  fallbackMessage = DEFAULT_MESSAGES.INTERNAL_ERROR,
  fallbackStatus = 500,
) {
  if (error instanceof SecurityApiError) {
    return NextResponse.json(
      { ok: false, message: error.publicMessage, code: error.code },
      { status: error.status },
    );
  }
  logInternalError(error);
  return NextResponse.json(
    { ok: false, message: fallbackMessage },
    { status: fallbackStatus },
  );
}

export function forbiddenResponse(message = DEFAULT_MESSAGES.FORBIDDEN) {
  return safeErrorResponse(createApiError("FORBIDDEN", message, 403));
}

export function logAndReturnSafeError(input: {
  error: unknown;
  request?: Request;
  action: string;
  entityType?: string;
  entityId?: string | null;
  companyId?: string | null;
  actorId?: string | null;
  fallbackMessage?: string;
  fallbackStatus?: number;
}) {
  if (!(input.error instanceof SecurityApiError)) {
    logSecurityEvent({
      request: input.request,
      actorId: input.actorId ?? null,
      companyId: input.companyId ?? null,
      action: input.action,
      entityType: input.entityType ?? "api",
      entityId: input.entityId ?? null,
      metadata: { error: "internal_error" },
    });
  }
  return safeErrorResponse(
    input.error,
    input.fallbackMessage,
    input.fallbackStatus,
  );
}

function statusForCode(code: ApiErrorCode) {
  switch (code) {
    case "BAD_REQUEST":
    case "VALIDATION_ERROR":
      return 400;
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "RATE_LIMITED":
      return 429;
    case "PROVIDER_UNAVAILABLE":
      return 503;
    case "INTERNAL_ERROR":
      return 500;
  }
}

function redactSensitive(value: string) {
  return value.replace(
    /(api[_-]?key|secret|token|password|signature|authorization)=?[^\s,]*/gi,
    "$1=[redacted]",
  );
}
