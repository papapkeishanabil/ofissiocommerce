import assert from "node:assert/strict";
import { createServer } from "node:http";
import fs from "node:fs";
import {
  getWordPressProviderGateSnapshot,
  resetWordPressProviderGateForTests,
  withWordPressProviderSlot,
} from "../src/features/products/woocommerce/wordpress-provider-gate";
import { requestWooCommerceJson } from "../src/features/products/woocommerce/woocommerce-http";

async function main() {
process.env.WORDPRESS_PROVIDER_MAX_CONCURRENCY = "2";
resetWordPressProviderGateForTests();

let active = 0;
let observed = 0;
const mixed = ["GET /products/:id", "GET /wp/v2/media", "GET /products/categories", "GET /products/attributes", "GET variation raw SKU"];
await Promise.all(Array.from({ length: 10 }, (_, index) => withWordPressProviderSlot(mixed[index % mixed.length]!, async () => {
  active += 1;
  observed = Math.max(observed, active);
  await delay(15);
  active -= 1;
})));
assert.equal(observed, 2, "10 mixed callers must never exceed two active provider requests");
assert.equal(getWordPressProviderGateSnapshot().maxObserved, 2);
assert.equal(getWordPressProviderGateSnapshot().activeRequests, 0);

for (const code of ["ECONNRESET", "ETIMEDOUT", "INVALID_RESPONSE"]) {
  await assert.rejects(withWordPressProviderSlot(`GET failure ${code}`, async () => { throw Object.assign(new Error(code), { code }); }));
  assert.equal(getWordPressProviderGateSnapshot().activeRequests, 0, `slot must be released after ${code}`);
}

let unblock!: () => void;
const blocked = new Promise<void>((resolve) => { unblock = resolve; });
const holders = [withWordPressProviderSlot("holder-1", () => blocked), withWordPressProviderSlot("holder-2", () => blocked)];
await waitUntil(() => getWordPressProviderGateSnapshot().activeRequests === 2);
let queuedTaskStarted = false;
const queued = withWordPressProviderSlot("queued-timeout", async () => {
  queuedTaskStarted = true;
  await delay(5);
  return "ok";
});
await delay(25);
assert.equal(queuedTaskStarted, false, "queued work must not start its upstream timeout before slot acquisition");
unblock();
await Promise.all(holders);
assert.equal(await queued, "ok");

const warnings: Error[] = [];
const warningHandler = (warning: Error) => warnings.push(warning);
process.on("warning", warningHandler);
const server = createServer((_request, response) => {
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end("{truncated");
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert.ok(address && typeof address !== "string");
const invalidResults = await Promise.allSettled(Array.from({ length: 12 }, (_, index) => requestWooCommerceJson(new URL(`http://127.0.0.1:${address.port}/${index % 3 === 0 ? "wp-json/wp/v2/media" : index % 3 === 1 ? "wp-json/wc/v3/products/65" : "wp-json/ofissio/v1/variation-raw-skus/65"}`))));
await new Promise<void>((resolve) => server.close(() => resolve()));
process.off("warning", warningHandler);
assert.equal(invalidResults.every((result) => result.status === "rejected" && (result.reason as { code?: string }).code === "INVALID_RESPONSE"), true, "malformed provider responses must preserve INVALID_RESPONSE");
assert.equal(warnings.some((warning) => warning.name === "MaxListenersExceededWarning"), false, "repeated failed responses must not leak listeners");
assert.equal(getWordPressProviderGateSnapshot().maxObserved, 2);
assert.equal(getWordPressProviderGateSnapshot().activeRequests, 0);
assert.equal(getWordPressProviderGateSnapshot().queuedRequests, 0);

const rawService = fs.readFileSync("src/features/products/woocommerce/woocommerce-raw-variation.service.ts", "utf8");
const mediaService = fs.readFileSync("src/features/products/woocommerce/wordpress-media-upload.service.ts", "utf8");
const wooClient = fs.readFileSync("src/features/products/woocommerce/woocommerce.client.ts", "utf8");
for (const [name, source] of [["raw SKU", rawService], ["WordPress Media", mediaService], ["WooCommerce", wooClient]] as const) assert.match(source, /requestWooCommerceJson/, `${name} must use the shared gated HTTP layer`);
assert.doesNotMatch(wooClient, /method === "GET" \? [^:]+ : [2-9]/, "writes must not gain blind retries");

console.log("PASS: global WordPress provider gate max=2, shared mixed queue, failure cleanup, delayed timeout start, INVALID_RESPONSE and no listener leak");
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });

function delay(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function waitUntil(predicate: () => boolean) { for (let index = 0; index < 100; index += 1) { if (predicate()) return; await delay(2); } throw new Error("Condition was not reached."); }
