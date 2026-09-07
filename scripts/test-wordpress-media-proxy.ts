import assert from "node:assert/strict";

import { GET as proxyWordPressMedia } from "../src/app/api/media/wordpress/[...path]/route";
import {
  WORDPRESS_MEDIA_PROXY_BASE,
  fromSameOriginWordPressMediaUrl,
  toProxiedWordPressMediaUrl,
  toSameOriginWordPressMediaUrl,
  validateWordPressMediaProxyPath,
} from "../src/features/products/woocommerce/wordpress-media-proxy";

const LOOPBACK_BASE = "http://localhost:10010";
const PROXY = WORDPRESS_MEDIA_PROXY_BASE;

// --- Helper: rewrite URL media → proxy same-origin ---
assert.equal(
  toProxiedWordPressMediaUrl(
    "http://localhost:10010/wp-content/uploads/2026/08/polo.jpg",
    LOOPBACK_BASE,
  ),
  `${PROXY}/wp-content/uploads/2026/08/polo.jpg`,
);
// Origin `.local` (LocalWP) dinormalisasi dulu lalu diproxy.
assert.equal(
  toProxiedWordPressMediaUrl(
    "http://ofissio.local:10010/wp-content/uploads/2026/08/polo.jpg",
    LOOPBACK_BASE,
  ),
  `${PROXY}/wp-content/uploads/2026/08/polo.jpg`,
);
assert.equal(
  toSameOriginWordPressMediaUrl(
    "http://ofissio.local/wp-content/uploads/2026/08/a.png",
    "http://ofissio.local",
  ),
  `${PROXY}/wp-content/uploads/2026/08/a.png`,
);
// Query `?ver=` ikut dipertahankan.
assert.equal(
  toProxiedWordPressMediaUrl(
    "http://localhost:10010/wp-content/uploads/2026/08/a.jpg?ver=3",
    LOOPBACK_BASE,
  ),
  `${PROXY}/wp-content/uploads/2026/08/a.jpg?ver=3`,
);
// Base publik, host lain, dan non-http tidak diubah.
assert.equal(
  toProxiedWordPressMediaUrl(
    "https://www.ofissio.com/wp-content/uploads/a.jpg",
    "https://www.ofissio.com",
  ),
  "https://www.ofissio.com/wp-content/uploads/a.jpg",
);
assert.equal(
  toProxiedWordPressMediaUrl("https://cdn.example.com/a.jpg", LOOPBACK_BASE),
  "https://cdn.example.com/a.jpg",
);
assert.equal(
  toProxiedWordPressMediaUrl(
    "/api/media/wordpress/wp-content/uploads/a.jpg",
    LOOPBACK_BASE,
  ),
  "/api/media/wordpress/wp-content/uploads/a.jpg",
);
assert.equal(
  toProxiedWordPressMediaUrl("data:image/png;base64,xxx", LOOPBACK_BASE),
  "data:image/png;base64,xxx",
);
assert.equal(
  toProxiedWordPressMediaUrl("blob:http://localhost:8000/x", LOOPBACK_BASE),
  "blob:http://localhost:8000/x",
);
assert.equal(
  toProxiedWordPressMediaUrl(
    "http://localhost:10010/wp-content/themes/2026/a.png",
    LOOPBACK_BASE,
  ),
  "http://localhost:10010/wp-content/themes/2026/a.png",
);
assert.equal(
  toProxiedWordPressMediaUrl(
    "http://localhost:10010/wp-content/uploads/a.jpg",
    "",
  ),
  "http://localhost:10010/wp-content/uploads/a.jpg",
);
console.log("PASS: rewrite URL media → proxy same-origin (hanya base loopback/.local).");

// --- Helper: write-back guard mengembalikan URL absolut ---
assert.equal(
  fromSameOriginWordPressMediaUrl(
    `${PROXY}/wp-content/uploads/2026/08/polo.jpg`,
    LOOPBACK_BASE,
  ),
  "http://localhost:10010/wp-content/uploads/2026/08/polo.jpg",
);
assert.equal(
  fromSameOriginWordPressMediaUrl(
    `${PROXY}/wp-content/uploads/a.jpg?ver=3`,
    LOOPBACK_BASE,
  ),
  "http://localhost:10010/wp-content/uploads/a.jpg?ver=3",
);
assert.equal(
  fromSameOriginWordPressMediaUrl("https://cdn.example.com/a.jpg", LOOPBACK_BASE),
  "https://cdn.example.com/a.jpg",
);
console.log("PASS: write-back guard mengembalikan URL absolut.");

// --- Validator path proxy ---
const target = validateWordPressMediaProxyPath(
  "/wp-content/uploads/2026/08/a.webp",
);
assert.equal(target.extension, ".webp");
assert.equal(target.mimeType, "image/webp");
assert.equal(
  validateWordPressMediaProxyPath("/wp-content/uploads/x/model.glb").mimeType,
  "model/gltf-binary",
);
for (const unsafe of [
  "/wp-content/uploads/2026/../secret/a.webp",
  "/wp-content/uploads/a\\b.webp",
  "/wp-content/uploads/\0a.webp",
  "/wp-content/themes/2026/a.png",
  "/wp-content/uploads/",
  "/wp-content/uploads/a.php",
  "/wp-content/uploads/a.svg",
  "/wp-content/uploads/tanpa-ekstensi",
  "/wp-content/uploads//a.webp",
]) {
  assert.throws(() => validateWordPressMediaProxyPath(unsafe));
}
console.log("PASS: validasi path menolak traversal, prefix asing, dan ekstensi terlarang.");

async function callRoute(
  path: string[],
  headers?: Record<string, string>,
): Promise<Response> {
  const joined = path.map((segment) => encodeURIComponent(segment)).join("/");
  const request = new Request(`http://localhost:8000${PROXY}/${joined}`, {
    headers,
  });
  return proxyWordPressMedia(request, { params: Promise.resolve({ path }) });
}

async function main() {
  // Port 9 praktis selalu menolak koneksi — mensimulasikan WordPress mati.
  process.env.WORDPRESS_MEDIA_BASE_URL = "http://localhost:9";

  const traversal = await callRoute([
    "wp-content",
    "uploads",
    "..",
    "secret",
    "a.webp",
  ]);
  assert.equal(traversal.status, 400);

  const badExtension = await callRoute(["wp-content", "uploads", "shell.php"]);
  assert.equal(badExtension.status, 400);

  const emptyPath = await proxyWordPressMedia(
    new Request(`http://localhost:8000${PROXY}/`),
    { params: Promise.resolve({ path: [] }) },
  );
  assert.equal(emptyPath.status, 400);
  console.log("PASS: route menolak traversal & ekstensi terlarang (400).");

  const unreachable = await callRoute([
    "wp-content",
    "uploads",
    "2026",
    "08",
    "a.webp",
  ]);
  assert.ok(
    unreachable.status >= 500,
    `expected 5xx for unreachable upstream, got ${unreachable.status}`,
  );
  console.log("PASS: base media tak terjangkau → error 5xx, bukan crash.");

  // Rate limit 300/menit per IP — fase ini memakai IP khusus agar kuota IP
  // "local" dari kasus-kasus sebelumnya tidak mengganggu.
  const burstHeaders = { "x-forwarded-for": "10.99.0.7" };
  for (let index = 0; index < 300; index += 1) {
    await callRoute(["wp-content", "uploads", "a.webp"], burstHeaders);
  }
  const throttled = await callRoute(
    ["wp-content", "uploads", "a.webp"],
    burstHeaders,
  );
  assert.equal(throttled.status, 429);
  console.log("PASS: rate limit 300/menit per IP aktif (429).");

  // Timer AbortSignal.timeout dari burst tadi masih menggantung — keluar
  // eksplisit agar status exit test deterministik.
  process.exit(0);
}

void main();
