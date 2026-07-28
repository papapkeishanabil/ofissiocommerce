import "server-only";

import { createApiError } from "./safe-error-response";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

type RateLimitGlobal = typeof globalThis & {
  __ofissioRateLimits?: Map<string, RateLimitBucket>;
};

const rateLimitGlobal = globalThis as RateLimitGlobal;
const buckets =
  rateLimitGlobal.__ofissioRateLimits ??
  (rateLimitGlobal.__ofissioRateLimits = new Map<string, RateLimitBucket>());

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

export function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

export function createRateLimitKey(request: Request, scope: string) {
  return `${scope}:${getClientIp(request)}`;
}

export function rateLimit(options: RateLimitOptions) {
  const now = Date.now();
  const current = buckets.get(options.key);
  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + options.windowMs };
    buckets.set(options.key, next);
    return { allowed: true, remaining: options.limit - 1, resetAt: next.resetAt };
  }

  if (current.count >= options.limit) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, options.limit - current.count),
    resetAt: current.resetAt,
  };
}

export function rateLimitOrThrow(options: RateLimitOptions) {
  const result = rateLimit(options);
  if (!result.allowed) {
    throw createApiError(
      "RATE_LIMITED",
      "Terlalu banyak percobaan. Silakan coba lagi sebentar lagi.",
      429,
      { resetAt: result.resetAt },
    );
  }
  return result;
}
