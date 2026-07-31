"use client";

interface ResolvedModelUrl {
  url: string;
  expiresAt: string | null;
}

const resolvedModelCache = new Map<string, ResolvedModelUrl>();
const pendingModelRequests = new Map<string, Promise<ResolvedModelUrl>>();

export function isProduct3DResolverUrl(value: string) {
  try {
    const pathname = new URL(value, window.location.origin).pathname;
    return /^\/api\/products\/woocommerce\/\d+\/3d-model\/signed-url\/?$/.test(pathname);
  } catch {
    return false;
  }
}

export async function resolveProduct3DUrl(sourceUrl: string) {
  if (!isProduct3DResolverUrl(sourceUrl)) return sourceUrl;
  const cached = resolvedModelCache.get(sourceUrl);
  if (cached && isFresh(cached.expiresAt)) return cached.url;
  const pending = pendingModelRequests.get(sourceUrl);
  if (pending) return (await pending).url;

  const request = fetch(sourceUrl, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
  }).then(async (response) => {
    const payload = (await response.json().catch(() => null)) as
      | { url?: string; expiresAt?: string; message?: string }
      | null;
    if (!response.ok || !payload?.url) {
      throw new Error(payload?.message || "Model 3D belum dapat dimuat.");
    }
    const result = { url: payload.url, expiresAt: payload.expiresAt ?? null };
    resolvedModelCache.set(sourceUrl, result);
    return result;
  }).finally(() => pendingModelRequests.delete(sourceUrl));
  pendingModelRequests.set(sourceUrl, request);
  return (await request).url;
}

function isFresh(expiresAt: string | null) {
  if (!expiresAt) return false;
  const expires = new Date(expiresAt).getTime();
  return Number.isFinite(expires) && expires - Date.now() > 60_000;
}
