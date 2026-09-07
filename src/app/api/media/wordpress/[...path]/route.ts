import { z } from "zod";

import { validateWordPressMediaProxyPath } from "@/features/products/woocommerce/wordpress-media-proxy";
import { getWordPressMediaRuntimeConfig } from "@/features/products/woocommerce/wordpress-media-upload.service";
import { withWordPressProviderSlot } from "@/features/products/woocommerce/wordpress-provider-gate";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import {
  createApiError,
  createValidationError,
  safeErrorResponse,
} from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

const pathParamsSchema = z.object({
  path: z.array(z.string().min(1)).min(1).max(16),
});

/** Katalog burst-load puluhan gambar per halaman — longgar tapi tetap membatasi. */
const RATE_LIMIT_PER_MINUTE = 300;
const UPSTREAM_TIMEOUT_MS = 60_000;
/** Sejajar MAX_GLB_UPLOAD_MB=100 — berkas media terbesar yang diizinkan. */
const MAX_MEDIA_BYTES = 100 * 1024 * 1024;
const IMAGE_CACHE_MAX_AGE = 86_400;
const MODEL_CACHE_MAX_AGE = 3_600;

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(request, "media.wordpress"),
      limit: RATE_LIMIT_PER_MINUTE,
      windowMs: 60_000,
    });

    const { path } = validateInput(pathParamsSchema, await context.params);
    let target;
    try {
      target = validateWordPressMediaProxyPath(`/${path.join("/")}`);
    } catch {
      throw createValidationError("Path media WordPress tidak valid.");
    }

    // Proxy file statis tidak butuh kredensial WP — cukup base URL terkonfigurasi.
    const baseUrl = getWordPressMediaRuntimeConfig().baseUrl;
    if (!baseUrl) {
      throw createApiError(
        "PROVIDER_UNAVAILABLE",
        "Media WordPress belum dikonfigurasi.",
        503,
      );
    }

    const upstreamUrl = new URL(
      target.pathname + new URL(request.url).search,
      baseUrl,
    );

    const upstream = await withWordPressProviderSlot("media.proxy", () =>
      fetch(upstreamUrl, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      }),
    );

    if (!upstream.ok || !upstream.body) {
      throw createApiError(
        "PROVIDER_UNAVAILABLE",
        "Media WordPress sedang tidak tersedia.",
        upstream.status === 404 ? 404 : 503,
      );
    }

    // Content-Type upstream wajib cocok allowlist — jangan pernah stream
    // halaman error HTML/PHP WordPress seolah-olah gambar.
    const upstreamContentType = (upstream.headers.get("content-type") ?? "")
      .split(";")[0]
      ?.trim()
      .toLowerCase();
    if (upstreamContentType !== target.mimeType) {
      throw createApiError("PROVIDER_UNAVAILABLE", "Tipe media tidak sesuai.", 503);
    }

    const contentLength = upstream.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_MEDIA_BYTES) {
      throw createApiError("BAD_REQUEST", "File media terlalu besar.", 413);
    }

    const headers = new Headers({
      "Content-Type": target.mimeType,
      // Nama berkas WordPress tidak content-hashed (re-upload bisa sama nama),
      // jadi tanpa `immutable`: gambar 1 hari, model/video 1 jam.
      "Cache-Control": `public, max-age=${
        target.mimeType.startsWith("image/") ? IMAGE_CACHE_MAX_AGE : MODEL_CACHE_MAX_AGE
      }`,
      "X-Content-Type-Options": "nosniff",
    });
    if (contentLength) headers.set("Content-Length", contentLength);

    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    return safeErrorResponse(error, "Media tidak dapat dimuat.", 502);
  }
}
