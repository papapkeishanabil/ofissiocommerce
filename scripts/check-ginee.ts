import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { loadEnvConfig } from "@next/env";

import { requireInternalAdmin } from "../src/features/admin/admin.service";
import { getGineeConfig, validateGineeConfig } from "../src/features/integrations/ginee/ginee.config";
import { GINEE_READ_ONLY_ENDPOINTS } from "../src/features/integrations/ginee/ginee.client";
import { createInMemoryGineeRepository } from "../src/features/integrations/ginee/ginee.repository";
import {
  detectUnmappedGineeSku,
  detectUnmappedWooSku,
  getGineeHealth,
  getGineeOrderDetail,
  processGineeWebhook,
  pullInventoryByStockSku,
  saveGineeMapping,
} from "../src/features/integrations/ginee/ginee.service";
import { buildGineeAuthorization, buildGineeSignature } from "../src/features/integrations/ginee/ginee.signer";
import { mockGineeProvider } from "../src/features/integrations/ginee/providers/mock-ginee.provider";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const originalEnv = { ...process.env };

run()
  .catch((error: unknown) => {
    console.error("ERROR: Ginee read-only check gagal.");
    console.error(error instanceof Error ? error.message : "Unknown Ginee check error.");
    process.exitCode = 1;
  })
  .finally(() => {
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  });

async function run() {
  console.log("Ofissio Ginee read-only check");
  console.log("-------------------------------");

  assertStaticMigrationContract();
  console.log("PASS: migration 021 menyediakan mapping, snapshot, webhook, forced RLS, dan write flags=false.");

  assertSigner();
  console.log("PASS: signature dan Authorization dummy deterministik (nilai rahasia tidak dicetak).");

  assertReadOnlyAllowlist();
  console.log("PASS: client hanya mengizinkan endpoint GET/POST read-only yang disetujui.");

  const repository = createInMemoryGineeRepository();
  for (const size of ["S", "M", "L"]) {
    await saveGineeMapping({
      parentSku: "KK-006",
      stockSku: `KK-006-${size}`,
      gineeSku: `KK-006-${size}`,
      sizeLabel: size,
    }, repository);
  }
  const mappings = await repository.listMappings();
  assert(mappings.length === 3, "mapping S/M/L harus tersimpan");
  assert(detectUnmappedWooSku(["KK-006-S", "KK-006-XL"], mappings).join() === "KK-006-XL", "unmapped Woo SKU salah");
  assert(detectUnmappedGineeSku(["KK-006-M", "GINEE-ONLY-L"], mappings).join() === "GINEE-ONLY-L", "unmapped Ginee SKU salah");
  console.log("PASS: mapping stock SKU KK-006-S/M/L dan deteksi unmapped SKU valid.");

  const shops = await mockGineeProvider.listShops();
  const orders = await mockGineeProvider.listOrders();
  assert(shops.length === 1, "mock shop harus tersedia");
  assert(orders.length === 1, "mock order list harus tersedia");
  const detail = await getGineeOrderDetail({
    orderId: orders[0]?.gineeOrderId ?? "",
    provider: mockGineeProvider,
    repository,
  });
  assert(detail.order.items[0]?.stockSku === "KK-006-M", "mock detail order SKU salah");
  assert(detail.unmappedSkus.length === 0, "SKU mock seharusnya mapped");
  assert(!detail.duplicate, "snapshot pertama tidak boleh dianggap duplicate");
  const duplicateDetail = await getGineeOrderDetail({
    orderId: orders[0]?.gineeOrderId ?? "",
    provider: mockGineeProvider,
    repository,
  });
  assert(duplicateDetail.duplicate && duplicateDetail.duplicateBy === "ginee_order_id", "duplicate order tidak terdeteksi");
  const inventory = await pullInventoryByStockSku({ stockSku: "KK-006-L", provider: mockGineeProvider, repository });
  assert(inventory.inventory.length === 1 && inventory.inventory[0]?.availableStock === 26, "mock inventory L salah");
  console.log("PASS: mock shop, order list/detail, snapshot sanitized, dan inventory by SKU valid.");

  await assertWebhook(repository);
  console.log("PASS: webhook valid diterima, duplicate idempotent, dan secret salah ditolak.");

  assertAdminGuards();
  console.log("PASS: super_admin diizinkan; customer, anonymous, dan role tanpa izin ditolak.");

  assertSecretSafety();
  console.log("PASS: secret Ginee tidak memakai NEXT_PUBLIC, tidak ada di client bundle, dan .env.local tidak tracked.");

  const config = getGineeConfig();
  const issues = validateGineeConfig(config);
  if (issues.length) console.log(`INFO: config warning: ${issues.join(" ")}`);
  if (config.useLiveProvider) {
    const health = await getGineeHealth();
    assert(health.connectionOk, "live read-only health Ginee gagal");
    console.log(`PASS: live read-only health aktif; ${health.shopCount} shop terbaca.`);
  } else {
    const health = await getGineeHealth(mockGineeProvider);
    assert(health.connectionOk, "mock health Ginee gagal");
    console.log("SKIP: live Ginee tidak dipanggil karena GINEE_TEST_LIVE bukan true; mock provider PASS.");
  }
}

function assertStaticMigrationContract() {
  const sql = readFileSync(join(process.cwd(), "database/migrations/021_ginee_readonly_integration.sql"), "utf8").toLowerCase();
  for (const table of ["ginee_product_mappings", "ginee_order_snapshots", "ginee_webhook_events"]) {
    assert(sql.includes(`create table if not exists public.${table}`), `migration tidak membuat ${table}`);
    assert(sql.includes(`alter table public.%i force row level security`) || sql.includes(`force row level security`), "migration wajib force RLS");
  }
  assert(sql.includes("sync_stock_enabled = false") && sql.includes("sync_order_enabled = false"), "write flags belum dikunci false");
  assert(sql.includes("revoke all") && sql.includes("from anon, authenticated"), "akses browser belum direvoke");
}

function assertSigner() {
  const input = {
    method: "POST",
    requestUri: "/openapi/order/v2/list-order",
    accessKey: "dummy-access",
    secretKey: "dummy-secret",
  };
  const expected = "pC2TW9IVXVX4WSUy/v4RCb8fIt8w8WiFhj1Vfe92rFs=";
  assert(buildGineeSignature(input) === expected, "signature dummy tidak deterministik");
  const authorization = buildGineeAuthorization(input);
  assert(authorization.startsWith("dummy-access:") && authorization.length > "dummy-access:".length, "Authorization header salah");
}

function assertReadOnlyAllowlist() {
  assert(GINEE_READ_ONLY_ENDPOINTS.length >= 5, "allowlist read-only terlalu sedikit");
  for (const endpoint of GINEE_READ_ONLY_ENDPOINTS) {
    assert(/^(GET|POST) \/openapi\//.test(endpoint), `method/path tidak aman: ${endpoint}`);
    assert(!/(create|update|cancel|ship|accept|delete|adjust)/i.test(endpoint), `endpoint destructive ditemukan: ${endpoint}`);
  }
}

async function assertWebhook(repository: ReturnType<typeof createInMemoryGineeRepository>) {
  const payload = { eventId: "event-check-001", eventType: "order.updated", entityType: "order", entityId: "GINEE-ORDER-1", customerName: "must-not-persist" };
  const rawBody = JSON.stringify(payload);
  const headers = new Headers({ "x-ofissio-ginee-webhook-secret": "check-secret" });
  const first = await processGineeWebhook({ headers, rawBody, payload, repository, expectedSecret: "check-secret" });
  const second = await processGineeWebhook({ headers, rawBody, payload, repository, expectedSecret: "check-secret" });
  assert(!first.idempotent && second.idempotent, "webhook duplicate tidak idempotent");
  assert(!("customerName" in first.event.sanitizedPayload), "PII webhook tersimpan");
  await assertRejects(() => processGineeWebhook({
    headers: new Headers({ "x-ofissio-ginee-webhook-secret": "wrong" }),
    rawBody,
    payload,
    repository,
    expectedSecret: "check-secret",
  }));
}

function assertAdminGuards() {
  const superAdmin = requireInternalAdmin(trustedInternalRequest("super_admin"), "admin:integration:ginee:update");
  assert(superAdmin.role === "super_admin", "super_admin harus diizinkan");
  assertThrows(() => requireInternalAdmin(trustedInternalRequest("finance_admin"), "admin:integration:ginee:view"));
  assertThrows(() => requireInternalAdmin(new Request("http://localhost/api/admin/integrations/ginee/health"), "admin:integration:ginee:view"));
  assertThrows(() => requireInternalAdmin(new Request("http://localhost/api/admin/integrations/ginee/health", {
    headers: {
      "x-ofissio-auth-verified": "1",
      "x-ofissio-auth-kind": "customer",
      "x-ofissio-user-id": "customer-check",
      "x-ofissio-company-id": "company-check",
      "x-ofissio-role": "company_admin",
    },
  }), "admin:integration:ginee:view"));
}

function trustedInternalRequest(role: string) {
  return new Request("http://localhost/api/admin/integrations/ginee/health", {
    headers: {
      "x-ofissio-auth-verified": "1",
      "x-ofissio-auth-kind": "internal",
      "x-ofissio-internal-role": role,
      "x-ofissio-internal-user-id": `ginee-check-${role}`,
      "x-ofissio-internal-user-name": "Ginee Check",
    },
  });
}

function assertSecretSafety() {
  const sourceRoots = [join(process.cwd(), "src"), join(process.cwd(), "scripts")];
  const forbidden = ["NEXT_PUBLIC_GINEE_ACCESS_KEY", "NEXT_PUBLIC_GINEE_SECRET_KEY", "NEXT_PUBLIC_GINEE_WEBHOOK_SECRET"];
  for (const root of sourceRoots) {
    for (const file of walkFiles(root)) {
      const content = readFileSync(file, "utf8");
      if (file.endsWith("check-ginee.ts") || file.endsWith("check-env.ts")) continue;
      for (const name of forbidden) assert(!content.includes(name), `${name} ditemukan di ${file}`);
    }
  }
  const actualSecrets = [process.env.GINEE_ACCESS_KEY, process.env.GINEE_SECRET_KEY, process.env.GINEE_WEBHOOK_SECRET]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value && value.length >= 8));
  const staticRoot = join(process.cwd(), ".next/static");
  if (existsSync(staticRoot)) {
    for (const file of walkFiles(staticRoot)) {
      const content = readFileSync(file, "utf8");
      for (const secret of actualSecrets) assert(!content.includes(secret), "Ginee secret ditemukan di client bundle");
    }
  }
  const tracked = spawnSync("git", ["ls-files", "--error-unmatch", ".env.local"], { encoding: "utf8" });
  assert(tracked.status !== 0, ".env.local tidak boleh tracked");
}

function walkFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...walkFiles(path));
    else if (/\.(?:js|mjs|cjs|ts|tsx|json)$/.test(name)) files.push(path);
  }
  return files;
}

async function assertRejects(work: () => Promise<unknown>) {
  let rejected = false;
  try { await work(); } catch { rejected = true; }
  assert(rejected, "promise seharusnya ditolak");
}

function assertThrows(work: () => unknown) {
  let rejected = false;
  try { work(); } catch { rejected = true; }
  assert(rejected, "guard seharusnya menolak request");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
