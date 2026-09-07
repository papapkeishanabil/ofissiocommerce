import assert from "node:assert/strict";

import { POST as createMeshyTask } from "../src/app/api/3d/meshy/create/route";
import { GET as pollMeshyTask } from "../src/app/api/3d/meshy/poll/route";
import { POST as createTripoTask } from "../src/app/api/3d/tripo/create/route";
import { GET as pollTripoTask } from "../src/app/api/3d/tripo/poll/route";
import { readSafePublicProductImage } from "../src/lib/security/public-product-image";

const valid = readSafePublicProductImage(
  "/products/kk-006/KK-006-front-nobg.webp",
);
assert.equal(valid.mimeType, "image/webp");
assert.ok(valid.data.length > 0);

for (const unsafePath of [
  "/products/../../.env.local",
  "/products/..\\..\\.env.local",
  "/.env.local",
  "C:\\Windows\\win.ini",
]) {
  assert.throws(() => readSafePublicProductImage(unsafePath));
}

async function main() {
  const anonymousRequests = [
    createMeshyTask(
    new Request("http://localhost/api/3d/meshy/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageUrl: "/products/kk-006/KK-006-front-nobg.webp" }),
    }),
    ),
    createTripoTask(
    new Request("http://localhost/api/3d/tripo/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imagePath: "/products/kk-006/KK-006-front-nobg.webp" }),
    }),
    ),
    pollMeshyTask(new Request("http://localhost/api/3d/meshy/poll?taskId=test")),
    pollTripoTask(new Request("http://localhost/api/3d/tripo/poll?taskId=test")),
  ];

  for (const response of await Promise.all(anonymousRequests)) {
    assert.equal(response.status, 403);
  }

  console.log("PASS: path traversal dan file non-produk ditolak.");
  console.log("PASS: magic bytes image produk diverifikasi.");
  console.log("PASS: create/poll Meshy dan Tripo menolak anonymous.");
}

void main();
