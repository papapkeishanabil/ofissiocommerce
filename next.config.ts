import type { NextConfig } from "next";

function configuredMediaOrigin() {
  const configured = process.env.WORDPRESS_MEDIA_BASE_URL?.trim();
  if (!configured) return "";
  try {
    const url = new URL(configured);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : "";
  } catch {
    return "";
  }
}

/** Gambar konten/foto produk diunggah ke WordPress Media lalu dirender lewat
 *  next/image — host media (derivasi WORDPRESS_MEDIA_BASE_URL) harus masuk
 *  remotePatterns agar optimizer bersedia mengambilnya. */
function mediaImageRemotePattern() {
  const mediaOrigin = configuredMediaOrigin();
  if (!mediaOrigin) return null;
  try {
    const url = new URL(mediaOrigin);
    const pattern: {
      protocol: "http" | "https";
      hostname: string;
      port?: string;
    } = {
      protocol: url.protocol === "https:" ? "https" : "http",
      hostname: url.hostname,
    };
    if (url.port) pattern.port = url.port;
    return pattern;
  } catch {
    return null;
  }
}

const mediaRemotePattern = mediaImageRemotePattern();

/** WordPress di mesin yang sama dengan app (localhost) di-resolve optimizer
 *  ke IP privat dan ditolak — hanya untuk host loopback flag SSRF ini
 *  dinyalakan; host media publik tetap memakai default (false). */
function isLoopbackHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

const nextConfig: NextConfig = {
  // Dev-server cross-origin protection blocks assets served to LAN clients
  // (e.g. http://192.168.2.4:8000 from another PC) unless the origin is listed.
  allowedDevOrigins: ["192.168.2.4"],
  // Keep development chunks isolated from `next build`. Running validation
  // while the dev server is active must not replace its webpack manifests.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  reactStrictMode: true,
  experimental: {
    // GLB/video uploads allow a 50 MB file; multipart boundaries add a small amount
    // of overhead before the Route Handler receives the body.
    proxyClientMaxBodySize: "52mb",
  },
  images: {
    qualities: [75, 95],
    ...(mediaRemotePattern
      ? {
          remotePatterns: [mediaRemotePattern],
          ...(isLoopbackHost(mediaRemotePattern.hostname)
            ? { dangerouslyAllowLocalIP: true }
            : {}),
        }
      : {}),
  },
  async redirects() {
    return [
      {
        source: "/favicon.ico",
        destination: "/favicon.svg",
        permanent: true,
      },
    ];
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== "production";
    const mediaOrigin = configuredMediaOrigin();
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' ${
        isDev ? "'unsafe-eval'" : ""
      }`.trim(),
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https: ${mediaOrigin} ${
        isDev ? "http://localhost:* http://127.0.0.1:*" : ""
      }`.trim(),
      "font-src 'self' data: https:",
      "connect-src 'self' blob: http://localhost:* ws://localhost:* https:",
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
