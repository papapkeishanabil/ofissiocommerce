import { createHmac } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { loadEnvConfig } from "@next/env";

import { requireInternalAdmin } from "../src/features/admin/admin.service";
import { getGineeConfig, validateGineeConfig } from "../src/features/integrations/ginee/ginee.config";
import { GINEE_READ_ONLY_ENDPOINTS } from "../src/features/integrations/ginee/ginee.client";
import { createInMemoryGineeRepository } from "../src/features/integrations/ginee/ginee.repository";
import {
  checkGineeStock,
  detectUnmappedGineeSku,
  detectUnmappedStockSku,
  getGineeHealth,
  saveGineeMapping,
} from "../src/features/integrations/ginee/ginee.service";
import { buildGineeAuthorization, buildGineeSignature } from "../src/features/integrations/ginee/ginee.signer";
import { mockGineeProvider } from "../src/features/integrations/ginee/providers/mock-ginee.provider";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const originalEnv = { ...process.env };

run()
  .catch((error: unknown) => {
    console.error("ERROR: Ginee inventory read-only check gagal.");
    console.error(error instanceof Error ? error.message : "Unknown Ginee check error.");
    process.exitCode = 1;
  })
  .finally(() => {
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  });

async function run() {
  console.log("Ofissio Ginee inventory read-only check");
  console.log("----------------------------------------");

  assertStaticMigrationContract();
  console.log("PASS: migration 021 hanya mewajibkan mapping SKU dan inventory snapshots dengan forced RLS.");

  assertSigner();
  console.log("PASS: signature dan Authorization inventory dummy valid tanpa mencetak secret.");

  assertInventoryOnlyAllowlist();
  console.log("PASS: client hanya mengizinkan endpoint baca warehouse inventory.");

  assertNoOrderOrDestructiveApi();
  console.log("PASS: tidak ada API order import, webhook order, atau endpoint destructive Ginee.");

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
  assert(detectUnmappedStockSku(["KK-006-S", "KK-006-XL"], mappings).join() === "KK-006-XL", "unmapped Stock SKU salah");
  assert(detectUnmappedGineeSku(["KK-006-M", "GINEE-ONLY-L"], mappings).join() === "GINEE-ONLY-L", "unmapped Ginee SKU salah");

  const expectedStock: Record<string, number> = { S: 36, M: 43, L: 26 };
  for (const size of ["S", "M", "L"]) {
    const result = await checkGineeStock({
      stockSku: `KK-006-${size}`,
      provider: mockGineeProvider,
      repository,
    });
    assert(result.mapped, `KK-006-${size} harus mapped`);
    assert(result.lastStock === expectedStock[size], `stok mock KK-006-${size} salah`);
  }
  const refreshedMappings = await repository.listMappings();
  assert(refreshedMappings.every((item) => item.lastCheckedAt && item.lastStock !== null), "hasil stock check belum memperbarui mapping");
  const snapshots = await repository.listInventorySnapshots();
  assert(snapshots.length === 4, "snapshot per warehouse S/M/L tidak tersimpan");
  console.log("PASS: stock SKU KK-006-S/M/L terbaca per ukuran dan per warehouse; snapshot serta last checked tersimpan.");

  const unmapped = await checkGineeStock({ stockSku: "KK-006-XL", provider: mockGineeProvider, repository });
  assert(!unmapped.mapped && unmapped.unmappedSkus.join() === "KK-006-XL", "unmapped stock check salah");
  console.log("PASS: laporan unmapped SKU tidak memakai nama produk sebagai matching key.");

  assertAdminGuards();
  console.log("PASS: super_admin diizinkan; customer, anonymous, dan role tanpa izin ditolak.");

  assertSecretSafety();
  console.log("PASS: secret Ginee server-side, tidak ditemukan di client bundle, dan .env.local tidak tracked.");

  const config = getGineeConfig();
  const issues = validateGineeConfig(config);
  if (issues.length) console.log(`INFO: config warning: ${issues.join(" ")}`);
  if (config.useLiveProvider) {
    const health = await getGineeHealth();
    assert(health.connectionOk, "live inventory health Ginee gagal");
    console.log("PASS: live inventory read-only health aktif karena GINEE_TEST_LIVE=true.");
  } else {
    const health = await getGineeHealth(mockGineeProvider);
    assert(health.connectionOk, "mock inventory health Ginee gagal");
    console.log("SKIP: API nyata tidak dipanggil karena GINEE_TEST_LIVE bukan true; mock inventory PASS.");
  }
}

function assertStaticMigrationContract() {
  const sql = readFileSync(join(process.cwd(), "database/migrations/021_ginee_readonly_integration.sql"), "utf8").toLowerCase();
  for (const table of ["ginee_product_mappings", "ginee_inventory_snapshots"]) {
    assert(sql.includes(`create table if not exists public.${table}`), `migration tidak membuat ${table}`);
  }
  assert(!sql.includes("create table if not exists public.ginee_order_snapshots"), "migration tidak boleh membuat order snapshot");
  assert(!sql.includes("create table if not exists public.ginee_webhook_events"), "migration tidak boleh membuat webhook order");
  assert(sql.includes("sync_stock_enabled = false"), "flag stock write belum dikunci false");
  assert(sql.includes("force row level security"), "migration wajib force RLS");
  assert(sql.includes("revoke all") && sql.includes("from anon, authenticated"), "akses browser belum direvoke");
}

function assertSigner() {
  const input = {
    method: "POST",
    requestUri: "/openapi/warehouse-inventory/v1/sku/list",
    accessKey: "dummy-access",
    secretKey: "dummy-secret",
  } as const;
  const expected = createHmac("sha256", input.secretKey)
    .update(`${input.method}$${input.requestUri}$`)
    .digest("base64");
  assert(buildGineeSignature(input) === expected, "signature inventory dummy tidak sesuai kontrak");
  const authorization = buildGineeAuthorization(input);
  assert(authorization === `${input.accessKey}:${expected}`, "Authorization header salah");
}

function assertInventoryOnlyAllowlist() {
  assert(GINEE_READ_ONLY_ENDPOINTS.length === 2, "allowlist harus hanya berisi dua endpoint inventory read-only");
  for (const endpoint of GINEE_READ_ONLY_ENDPOINTS) {
    assert(/^(GET|POST) \/openapi\/warehouse-inventory\//.test(endpoint), `endpoint non-inventory ditemukan: ${endpoint}`);
    assert(!/(order|shop|create|update|cancel|ship|accept|delete|adjust)/i.test(endpoint), `endpoint terlarang ditemukan: ${endpoint}`);
  }
}

function assertNoOrderOrDestructiveApi() {
  const apiRoot = join(process.cwd(), "src/app/api");
  const forbiddenRoutes = [
    "src/app/api/admin/integrations/ginee/orders/route.ts",
    "src/app/api/admin/integrations/ginee/webhooks/route.ts",
    "src/app/api/integrations/ginee/webhook/route.ts",
  ];
  for (const route of forbiddenRoutes) assert(!existsSync(join(process.cwd(), route)), `route terlarang masih ada: ${route}`);
  for (const file of walkFiles(apiRoot).filter((item) => item.includes(`${join("integrations", "ginee")}`))) {
    const content = readFileSync(file, "utf8");
    assert(!/(accept|cancel|ship|updateStock|createOrder|importOrder)/i.test(content), `operasi destructive ditemukan di ${file}`);
  }
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
  const forbidden = ["NEXT_PUBLIC_GINEE_ACCESS_KEY", "NEXT_PUBLIC_GINEE_SECRET_KEY"];
  for (const root of sourceRoots) {
    for (const file of walkFiles(root)) {
      const content = readFileSync(file, "utf8");
      if (file.endsWith("check-ginee.ts") || file.endsWith("check-env.ts")) continue;
      for (const name of forbidden) assert(!content.includes(name), `${name} ditemukan di ${file}`);
    }
  }
  const actualSecrets = [process.env.GINEE_ACCESS_KEY, process.env.GINEE_SECRET_KEY]
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

function assertThrows(work: () => unknown) {
  let rejected = false;
  try { work(); } catch { rejected = true; }
  assert(rejected, "guard seharusnya menolak request");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
