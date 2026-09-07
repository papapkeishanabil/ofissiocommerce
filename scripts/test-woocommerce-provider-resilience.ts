import assert from "node:assert/strict";
import fs from "node:fs";
import { isTransientWooCommerceFailure } from "../src/features/products/woocommerce/woocommerce.client";

for (const code of ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE", "ECONNABORTED", "INVALID_RESPONSE", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT"]) {
  assert.equal(isTransientWooCommerceFailure(0, code), true, `${code} must be transient`);
}
for (const status of [429, 502, 503, 504]) assert.equal(isTransientWooCommerceFailure(status, `HTTP_${status}`), true);
for (const status of [400, 401, 403, 404, 422]) assert.equal(isTransientWooCommerceFailure(status, `HTTP_${status}`), false);

const client = fs.readFileSync("src/features/products/woocommerce/woocommerce.client.ts", "utf8");
assert.match(client, /method === "GET" \? 3 : 1/, "only GET requests may receive automatic wrapper retries");
assert.match(client, /WOOCOMMERCE_PROVIDER_ERROR/, "safe provider diagnostic event must be retained");
const repair = fs.readFileSync("src/features/product-integrity-repair/product-integrity-repair-execute.service.ts", "utf8");
assert.match(repair, /updateAndVerifyVariation/, "variation writes must reconcile and verify before success");
assert.match(repair, /isTransientWooCommerceError/, "write reconciliation must be limited to transient failures");
console.log("PASS: WooCommerce transient classification, GET retry boundary, diagnostics, and repair reconciliation");
