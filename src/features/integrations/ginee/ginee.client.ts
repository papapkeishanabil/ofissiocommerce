import "server-only";

import { createApiError, logInternalError } from "@/lib/security/safe-error-response";

import { getGineeConfig } from "./ginee.config";
import { buildGineeAuthorization } from "./ginee.signer";

const READ_ONLY_ENDPOINTS = new Set([
  "POST /openapi/warehouse-inventory/v1/sku/list",
  "GET /openapi/warehouse-inventory/v1/sku/get",
]);

interface GineeEnvelope<T> {
  code?: string;
  message?: string;
  data?: T;
  transactionId?: string;
}

export async function gineeReadRequest<T>(input: {
  method: "GET" | "POST";
  requestUri: string;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
}) {
  const config = getGineeConfig();
  const endpointKey = `${input.method} ${input.requestUri}`;
  if (!READ_ONLY_ENDPOINTS.has(endpointKey)) {
    throw createApiError("FORBIDDEN", "Operasi Ginee bukan read-only.", 403);
  }
  if (!config.isConfigured) {
    throw createApiError("PROVIDER_UNAVAILABLE", "Koneksi Ginee belum dikonfigurasi.", 503);
  }
  const url = new URL(`${config.baseUrl}${input.requestUri}`);
  for (const [key, value] of Object.entries(input.query ?? {})) url.searchParams.set(key, value);
  const authorization = buildGineeAuthorization({
    method: input.method,
    requestUri: input.requestUri,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(url, {
        method: input.method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Advai-Country": config.country,
          Authorization: authorization,
        },
        body: input.method === "POST" ? JSON.stringify(input.body ?? {}) : undefined,
        cache: "no-store",
        signal: controller.signal,
      });
      const envelope = (await response.json().catch(() => null)) as GineeEnvelope<T> | null;
      if (!response.ok || !envelope || envelope.code !== "SUCCESS") {
        if (response.status >= 500 && attempt === 0) continue;
        throw createApiError("PROVIDER_UNAVAILABLE", "Ginee belum dapat memproses request read-only.", 503, {
          providerCode: envelope?.code ?? "http_error",
          status: response.status,
        });
      }
      return envelope.data as T;
    } catch (error) {
      lastError = error;
      if (attempt === 0 && !(error instanceof Error && error.name === "SecurityApiError")) continue;
    } finally {
      clearTimeout(timeout);
    }
  }

  logInternalError(lastError, { area: "ginee", operation: endpointKey });
  throw createApiError("PROVIDER_UNAVAILABLE", "Ginee belum dapat dihubungi.", 503);
}

export const GINEE_READ_ONLY_ENDPOINTS = [...READ_ONLY_ENDPOINTS];
