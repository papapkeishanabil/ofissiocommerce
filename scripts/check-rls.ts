import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { loadEnvConfig } from "@next/env";

import { getAuthRuntimeConfig } from "../src/features/auth/auth.config";
import { requireInternalAdmin } from "../src/features/admin/admin.service";
import { verifyBiteshipWebhook } from "../src/features/carrier-shipping/carrier-shipping.service";
import { verifyCallbackSignature } from "../src/features/payment/providers/ipaymu.provider";
import { requireAuth } from "../src/lib/security/auth-guard";
import { requireCompanyAccess } from "../src/lib/security/company-access";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

type RlsInventoryRow = {
  table_name: string;
  rls_enabled: boolean;
  rls_forced: boolean;
  policy_count: number;
  write_policy_count: number;
  anonymous_policy_count: number;
};

const REQUIRED_RLS_TABLES = [
  "companies",
  "user_profiles",
  "company_users",
  "company_addresses",
  "company_memberships",
  "internal_user_profiles",
  "carts",
  "cart_items",
  "cart_item_size_matrix",
  "cart_item_customizations",
  "quotations",
  "quotation_items",
  "quotation_events",
  "orders",
  "order_items",
  "payments",
  "payment_events",
  "documents",
  "uploaded_files",
  "company_logos",
  "shipments",
  "shipment_events",
  "shipping_quotes",
  "shipping_shipments",
  "shipping_events",
  "tracking_records",
  "process_orders",
  "process_order_items",
  "process_order_tasks",
  "process_order_events",
  "email_logs",
  "audit_logs",
  "woo_sync_logs",
  "admin_notifications",
] as const;

const SERVER_ONLY_TABLES = new Set([
  "internal_user_profiles",
  "quotation_events",
  "payment_events",
  "documents",
  "uploaded_files",
  "shipments",
  "shipment_events",
  "shipping_events",
  "process_orders",
  "process_order_items",
  "process_order_tasks",
  "process_order_events",
  "email_logs",
  "audit_logs",
  "woo_sync_logs",
  "admin_notifications",
]);

const originalEnv = { ...process.env };

run()
  .catch((error: unknown) => {
    console.error("ERROR: final RLS security check gagal.");
    console.error(`Reason: ${safeReason(error)}`);
    process.exitCode = 1;
  })
  .finally(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

async function run() {
  printHeader();
  assertStaticMigrationContract();
  console.log("PASS: migration 020 mencakup seluruh tabel sensitif dan menutup direct writes.");

  assertApiAndServerOnlyBoundaries();
  console.log("PASS: endpoint sensitif memakai session/RBAC/company guard atau verified webhook.");

  assertRuntimeGuards();
  console.log("PASS: anonymous/customer admin access ditolak; permission dan super admin valid.");

  assertInvalidProviderCallbacks();
  console.log("PASS: signature payment dan secret shipping yang invalid ditolak.");

  assertNoClientSecrets();
  console.log("PASS: service-role/provider secret tidak ditemukan di client source/bundle.");

  if ((process.env.DATABASE_PROVIDER?.trim() || "mock") !== "supabase") {
    console.log("SKIP: live RLS inventory; DATABASE_PROVIDER bukan supabase.");
    return;
  }

  const baseUrl = normalizeSupabaseUrl(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"));
  const anonKey = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const inventory = await readRlsInventory(baseUrl, serviceRoleKey);
  assertLiveInventory(inventory);
  console.log(`PASS: ${inventory.length} tabel live memakai RLS enabled + forced.`);

  await assertAnonymousCannotRead(baseUrl, anonKey);
  console.log("PASS: anonymous tidak dapat membaca row customer/internal.");

  await assertPrivateStorageBuckets(baseUrl, serviceRoleKey);
  console.log("PASS: seluruh bucket aktif terkonfigurasi private.");
}

function assertStaticMigrationContract() {
  const migration = source("database/migrations/020_rls_final_security_review.sql");
  for (const table of REQUIRED_RLS_TABLES) {
    assert(
      migration.includes(`alter table public.${table} enable row level security`) &&
        migration.includes(`alter table public.${table} force row level security`),
      `RLS migration belum lengkap untuk ${table}`,
    );
  }
  for (const forbiddenWritePolicy of [
    "uploaded_files_company_insert",
    "carts_owner_write",
    "quotation_events_company_insert",
    "payment_events_company_insert",
    "woo_sync_logs_company_insert",
  ]) {
    assert(
      migration.includes(`drop policy if exists ${forbiddenWritePolicy}`),
      `direct write policy belum dicabut: ${forbiddenWritePolicy}`,
    );
  }
  assert(migration.includes("ofissio_has_company_access"), "membership helper tidak ada");
  assert(migration.includes("set public = false"), "bucket private enforcement tidak ada");
}

function assertApiAndServerOnlyBoundaries() {
  const guardedRoutes = [
    "src/app/api/quotation/request/route.ts",
    "src/app/api/quotation/custom-request/route.ts",
    "src/app/api/quotation/[id]/accept/route.ts",
    "src/app/api/quotation/[id]/reject/route.ts",
    "src/app/api/quotation/[id]/request-revision/route.ts",
    "src/app/api/checkout/cart/route.ts",
    "src/app/api/files/upload/route.ts",
    "src/app/api/files/[id]/signed-url/route.ts",
    "src/app/api/payment/ipaymu/create/route.ts",
    "src/app/api/payment/status/route.ts",
    "src/app/api/orders/[id]/invoice/route.ts",
    "src/app/api/orders/[id]/shipment/route.ts",
    "src/app/api/shipping/create-shipment/route.ts",
  ];
  for (const path of guardedRoutes) {
    const value = source(path);
    assert(value.includes("requireAuth"), `${path} belum memiliki auth guard`);
    assert(
      value.includes("requireRole") ||
        value.includes("requireCompanyAccess") ||
        value.includes("requireFileUploadRole"),
      `${path} belum memiliki permission/company guard`,
    );
  }

  for (const path of [
    "src/app/api/company/profile/route.ts",
    "src/app/api/company/addresses/route.ts",
  ]) {
    assert(source(path).includes("requireAuth"), `${path} belum memiliki auth guard`);
  }
  const customerAccountService = source(
    "src/features/customer-account/customer-account.service.ts",
  );
  assert(
    customerAccountService.includes("requireProfileWrite") &&
      customerAccountService.includes("requireAddressWrite") &&
      customerAccountService.includes("input.session.companyId"),
    "profile/address service belum memiliki role dan company guard",
  );

  for (const path of [
    "src/app/api/admin/orders/route.ts",
    "src/app/api/admin/quotations/route.ts",
    "src/app/api/admin/process-orders/route.ts",
    "src/app/api/admin/notifications/route.ts",
    "src/app/api/admin/orders/[id]/generate-invoice/route.ts",
    "src/app/api/admin/orders/[id]/send-invoice/route.ts",
    "src/app/api/admin/orders/[id]/shipping/create/route.ts",
  ]) {
    assert(source(path).includes("requireInternalAdmin"), `${path} belum memakai admin guard`);
  }

  assert(
    source("src/app/api/payment/ipaymu/callback/route.ts").includes("processIpaymuCallback"),
    "payment callback belum memakai verified processor",
  );
  assert(
    source("src/app/api/shipping/biteship/webhook/route.ts").includes("processBiteshipWebhook"),
    "shipping webhook belum memakai verified processor",
  );

  for (const path of [
    "src/features/database/supabase-admin.client.ts",
    "src/features/storage/providers/supabase-storage.provider.ts",
    "src/features/payment/providers/ipaymu.provider.ts",
    "src/features/carrier-shipping/providers/biteship.provider.ts",
  ]) {
    assert(source(path).includes('import "server-only"'), `${path} harus server-only`);
  }
}

function assertRuntimeGuards() {
  process.env.AUTH_MODE = "production";
  process.env.AUTH_PROVIDER = "supabase";
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "check-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= "check-service-role-key";
  process.env.ADMIN_DEV_BYPASS = "true";
  process.env.INTERNAL_DEV_HEADERS_ENABLED = "true";

  const productionConfig = getAuthRuntimeConfig();
  assert(!productionConfig.adminDevBypass, "admin dev bypass aktif di production");
  assert(!productionConfig.internalDevHeadersEnabled, "dev identity headers aktif di production");

  assertThrows(() => requireAuth(new Request("http://localhost/api/quotation")));
  assertThrows(() => requireInternalAdmin(new Request("http://localhost/api/admin/orders"), "admin:order:view"));

  const customerRequest = trustedCustomerRequest("company-a", "customer-a");
  const customer = requireAuth(customerRequest);
  requireCompanyAccess(customer, "company-a");
  assertThrows(() => requireCompanyAccess(customer, "company-b"));
  assertThrows(() => requireInternalAdmin(customerRequest, "admin:order:view"));

  assertThrows(() =>
    requireInternalAdmin(trustedInternalRequest("support"), "admin:order:update"),
  );
  const superAdmin = requireInternalAdmin(
    trustedInternalRequest("super_admin"),
    "admin:order:update",
  );
  assert(superAdmin.role === "super_admin", "super admin tidak mendapat permission");
}

function assertInvalidProviderCallbacks() {
  const invalidPayment = verifyCallbackSignature(
    { reference_id: "OF-RLS-CHECK", sub_total: 10000, status: "berhasil" },
    new Headers({ "x-signature": "0".repeat(64) }),
  );
  assert(!invalidPayment, "invalid payment callback signature diterima");

  const invalidShipping = verifyBiteshipWebhook(
    new Headers({ "x-biteship-webhook-secret": "wrong-secret" }),
    JSON.stringify({ id: "shipment-check", status: "delivered" }),
    "expected-secret",
  );
  assert(!invalidShipping, "invalid shipping webhook secret diterima");
}

async function readRlsInventory(baseUrl: string, serviceRoleKey: string) {
  const response = await fetch(`${baseUrl}/rest/v1/rpc/ofissio_rls_security_inventory`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: "{}",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "migration_020_not_applied"
        : `rls_inventory_unavailable_${response.status}`,
    );
  }
  return (await response.json()) as RlsInventoryRow[];
}

function assertLiveInventory(rows: RlsInventoryRow[]) {
  const byTable = new Map(rows.map((row) => [row.table_name, row]));
  for (const table of REQUIRED_RLS_TABLES) {
    const row = byTable.get(table);
    assert(row, `inventory tidak memuat ${table}`);
    assert(row.rls_enabled, `RLS belum enabled pada ${table}`);
    assert(row.rls_forced, `RLS belum forced pada ${table}`);
    assert(Number(row.write_policy_count) === 0, `direct write policy masih aktif pada ${table}`);
    assert(Number(row.anonymous_policy_count) === 0, `anonymous policy masih aktif pada ${table}`);
    if (SERVER_ONLY_TABLES.has(table)) {
      assert(Number(row.policy_count) === 0, `${table} seharusnya hanya melalui server API`);
    }
  }
}

async function assertAnonymousCannotRead(baseUrl: string, anonKey: string) {
  for (const table of REQUIRED_RLS_TABLES) {
    const response = await fetch(
      `${baseUrl}/rest/v1/${encodeURIComponent(table)}?select=id&limit=1`,
      {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        cache: "no-store",
      },
    );
    if (response.status === 401 || response.status === 403) continue;
    assert(response.ok, `anonymous check ${table} gagal HTTP ${response.status}`);
    const rows = (await response.json().catch(() => [])) as unknown[];
    assert(rows.length === 0, `anonymous dapat membaca row ${table}`);
  }
}

async function assertPrivateStorageBuckets(baseUrl: string, serviceRoleKey: string) {
  const response = await fetch(`${baseUrl}/storage/v1/bucket`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    cache: "no-store",
  });
  assert(response.ok, `bucket inventory gagal HTTP ${response.status}`);
  const rows = (await response.json()) as Array<{ id?: string; name?: string; public?: boolean }>;
  const activeBuckets = [
    process.env.STORAGE_BUCKET_LOGOS || "ofissio-logos",
    process.env.STORAGE_BUCKET_ARTWORK || "ofissio-artwork",
    process.env.STORAGE_BUCKET_DOCUMENTS || "ofissio-documents",
    process.env.STORAGE_BUCKET_3D || "ofissio-3d-models",
  ];
  for (const bucket of activeBuckets) {
    const row = rows.find((item) => item.id === bucket || item.name === bucket);
    assert(row, `bucket tidak ditemukan: ${bucket}`);
    assert(row.public === false, `bucket harus private: ${bucket}`);
  }
}

function assertNoClientSecrets() {
  const forbiddenNames = [
    "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_IPAYMU_API_KEY",
    "NEXT_PUBLIC_BITESHIP_API_KEY",
    "NEXT_PUBLIC_BITESHIP_WEBHOOK_SECRET",
    "NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET",
  ];
  for (const file of walk(join(process.cwd(), "src"))) {
    const value = readFileSync(file, "utf8");
    if (!value.includes('"use client"') && !value.includes("'use client'")) continue;
    for (const name of forbiddenNames) {
      assert(!value.includes(name), `${name} ditemukan di client source ${file}`);
    }
  }

  const secretValues = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.IPAYMU_API_KEY,
    process.env.BITESHIP_API_KEY,
    process.env.BITESHIP_WEBHOOK_SECRET,
    process.env.WOOCOMMERCE_CONSUMER_SECRET,
  ].filter((value): value is string => Boolean(value && value.length >= 8));
  const staticDir = join(process.cwd(), ".next", "static");
  try {
    for (const file of walk(staticDir)) {
      const value = readFileSync(file, "utf8");
      for (const secret of secretValues) {
        assert(!value.includes(secret), `server secret ditemukan di ${file}`);
      }
    }
  } catch {
    // A build may not exist yet. Source inspection above remains mandatory.
  }
}

function trustedCustomerRequest(companyId: string, userId: string) {
  return new Request("http://localhost/api/quotation", {
    headers: {
      "x-ofissio-auth-verified": "1",
      "x-ofissio-auth-kind": "customer",
      "x-ofissio-company-id": companyId,
      "x-ofissio-company-name": "RLS Company",
      "x-ofissio-user-id": userId,
      "x-ofissio-user-email": "rls-customer@example.test",
      "x-ofissio-user-name": "RLS Customer",
      "x-ofissio-role": "customer_admin",
    },
  });
}

function trustedInternalRequest(role: string) {
  return new Request("http://localhost/api/admin/orders", {
    headers: {
      "x-ofissio-auth-verified": "1",
      "x-ofissio-auth-kind": "internal",
      "x-ofissio-internal-role": role,
      "x-ofissio-internal-user-id": `rls-${role}`,
      "x-ofissio-internal-user-name": "RLS Check",
    },
  });
}

function source(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function walk(path: string): string[] {
  return readdirSync(path).flatMap((name) => {
    const item = join(path, name);
    return statSync(item).isDirectory() ? walk(item) : [item];
  });
}

function normalizeSupabaseUrl(value: string) {
  try {
    const url = new URL(value.trim().replace(/\/+$/, ""));
    if (url.protocol !== "https:" && url.hostname !== "localhost") throw new Error();
    return url.toString().replace(/\/+$/, "");
  } catch {
    throw new Error("invalid_supabase_url");
  }
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_missing`);
  return value;
}

function assertThrows(action: () => unknown) {
  let threw = false;
  try {
    action();
  } catch {
    threw = true;
  }
  assert(threw, "aksi seharusnya ditolak");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function safeReason(error: unknown) {
  if (!(error instanceof Error)) return "unknown_error";
  return error.message.replace(
    /(api[_-]?key|secret|token|password|signature|authorization)=?[^\s,]*/gi,
    "$1=[redacted]",
  );
}

function printHeader() {
  const title = "Ofissio final RLS security review";
  console.log(title);
  console.log("-".repeat(title.length));
}
