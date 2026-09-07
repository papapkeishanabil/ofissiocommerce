// URL media WordPress (gambar produk, GLB legacy) diubah menjadi path proxy
// same-origin agar perangkat lain di LAN tidak diminta mengambil `localhost`
// miliknya sendiri. Modul ini murni (tanpa `server-only`) karena ikut
// ter-bundle ke client lewat product.mapper di cart-store.

import {
  isLoopbackOrLocalHostname,
  normalizeWooCommerceMediaUrl,
  stripApiPath,
} from "./woocommerce-media-url";

export const WORDPRESS_MEDIA_PROXY_BASE = "/api/media/wordpress";

/** Hanya berkas di bawah uploads (galeri WordPress) yang boleh diproxy. */
export const WORDPRESS_MEDIA_PATH_PREFIX = "/wp-content/uploads/";

/** Allowlist ekstensi → MIME; Content-Type upstream wajib cocok dengan peta ini. */
export const WORDPRESS_MEDIA_MIME_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".glb": "model/gltf-binary",
  ".mp4": "video/mp4",
};

export interface WordPressMediaProxyTarget {
  pathname: string;
  extension: string;
  mimeType: string;
}

export function isWordPressMediaProxyUrl(value: string) {
  return value.startsWith(`${WORDPRESS_MEDIA_PROXY_BASE}/`);
}

/**
 * Ubah URL absolut media WordPress menjadi path proxy same-origin. Proxy hanya
 * aktif ketika base media loopback/`.local` (LocalWP di mesin yang sama) — base
 * publik (staging/produksi) dikembalikan apa adanya agar trafik CDN tidak
 * difunnel lewat aplikasi.
 */
export function toSameOriginWordPressMediaUrl(
  value: string,
  configuredBaseUrl: string,
) {
  const sourceValue = value.trim();
  const baseValue = configuredBaseUrl.trim();
  if (!sourceValue || !baseValue) return sourceValue;
  if (
    sourceValue.startsWith("/") ||
    sourceValue.startsWith("data:") ||
    sourceValue.startsWith("blob:")
  ) {
    return sourceValue;
  }

  try {
    const source = new URL(sourceValue);
    const base = new URL(stripApiPath(baseValue));
    if (!isLoopbackOrLocalHostname(base.hostname)) return sourceValue;
    if (source.origin !== base.origin) return sourceValue;
    if (!source.pathname.startsWith(WORDPRESS_MEDIA_PATH_PREFIX)) {
      return sourceValue;
    }
    return `${WORDPRESS_MEDIA_PROXY_BASE}${source.pathname}${source.search}`;
  } catch {
    return sourceValue;
  }
}

/**
 * Kebalikan proxy — pulihkan URL absolut sehingga path `/api/...` tidak pernah
 * tersimpan kembali ke WooCommerce.
 */
export function fromSameOriginWordPressMediaUrl(
  value: string,
  configuredBaseUrl: string,
) {
  const baseValue = configuredBaseUrl.trim();
  if (!baseValue || !isWordPressMediaProxyUrl(value)) return value;
  return `${stripApiPath(baseValue)}${value.slice(WORDPRESS_MEDIA_PROXY_BASE.length)}`;
}

/** Pipeline lengkap: normalisasi origin loopback/`.local` lalu ubah ke proxy. */
export function toProxiedWordPressMediaUrl(
  value: string,
  configuredBaseUrl: string,
) {
  return toSameOriginWordPressMediaUrl(
    normalizeWooCommerceMediaUrl(value, configuredBaseUrl),
    configuredBaseUrl,
  );
}

/**
 * Validasi path permintaan proxy: tolak traversal, prefix di luar uploads,
 * segmen kosong, dan ekstensi di luar allowlist. Dipakai route sebelum fetch
 * upstream — satu-satunya gerbang SSRF menuju WordPress.
 */
export function validateWordPressMediaProxyPath(
  pathname: string,
): WordPressMediaProxyTarget {
  if (pathname.includes("\0") || pathname.includes("\\")) {
    throw new Error("wordpress_media_invalid_path");
  }
  if (!pathname.startsWith(WORDPRESS_MEDIA_PATH_PREFIX)) {
    throw new Error("wordpress_media_invalid_path");
  }
  const segments = pathname.slice(1).split("/");
  if (
    segments.some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new Error("wordpress_media_invalid_path");
  }
  const filename = segments[segments.length - 1];
  if (!filename) {
    throw new Error("wordpress_media_invalid_path");
  }
  const dotIndex = filename.lastIndexOf(".");
  const extension = dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : "";
  const mimeType = WORDPRESS_MEDIA_MIME_BY_EXTENSION[extension];
  if (!mimeType) {
    throw new Error("wordpress_media_invalid_path");
  }
  return { pathname, extension, mimeType };
}
