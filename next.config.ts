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

const nextConfig: NextConfig = {
  // Keep development chunks isolated from `next build`. Running validation
  // while the dev server is active must not replace its webpack manifests.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  reactStrictMode: true,
  // Avoid intermittent manifest races from the separate webpack worker on Windows.
  experimental: { webpackBuildWorker: false },
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
