"use client";

interface ResolvedModelUrl {
  url: string;
  expiresAt: string | null;
}

const resolvedModelCache = new Map<string, ResolvedModelUrl>();
const pendingModelRequests = new Map<string, Promise<ResolvedModelUrl>>();
const RESOLVER_RETRY_DELAYS_MS = [0, 400, 1_200] as const;

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

  const request = requestResolvedModelUrl(sourceUrl)
    .then((result) => {
      resolvedModelCache.set(sourceUrl, result);
      return result;
    })
    .finally(() => pendingModelRequests.delete(sourceUrl));
  pendingModelRequests.set(sourceUrl, request);
  return (await request).url;
}

/**
 * Hapus hasil resolusi URL model 3D. Dipanggil setelah upload GLB baru agar
 * resolve berikutnya mengambil token versi terbaru dari resolver, bukan URL
 * konten lama yang masih tersimpan di cache modul.
 */
export function clearResolvedProduct3DUrlCache(sourceUrl?: string) {
  if (sourceUrl) {
    resolvedModelCache.delete(sourceUrl);
    return;
  }
  resolvedModelCache.clear();
}

async function requestResolvedModelUrl(sourceUrl: string): Promise<ResolvedModelUrl> {
  let lastMessage = "Model 3D belum dapat dimuat.";

  for (let attempt = 0; attempt < RESOLVER_RETRY_DELAYS_MS.length; attempt += 1) {
    const delayMs = RESOLVER_RETRY_DELAYS_MS[attempt] ?? 0;
    if (delayMs > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }

    try {
      const response = await fetch(sourceUrl, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json().catch(() => null)) as
        | { url?: string; expiresAt?: string; message?: string }
        | null;
      if (response.ok && payload?.url) {
        return { url: payload.url, expiresAt: payload.expiresAt ?? null };
      }
      lastMessage = payload?.message || lastMessage;
      const retryable = response.status === 404 || response.status === 429 || response.status >= 500;
      if (!retryable) break;
    } catch (error) {
      lastMessage = error instanceof Error ? error.message : lastMessage;
    }
  }

  throw new Error(lastMessage);
}

function isFresh(expiresAt: string | null) {
  if (!expiresAt) return false;
  const expires = new Date(expiresAt).getTime();
  return Number.isFinite(expires) && expires - Date.now() > 60_000;
}
