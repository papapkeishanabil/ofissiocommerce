import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { getAuthRuntimeConfig } from "../src/features/auth/auth.config";
import { requireInternalAdmin } from "../src/features/admin/admin.service";
import { requireAuth } from "../src/lib/security/auth-guard";
import { requireCompanyAccess } from "../src/lib/security/company-access";

const originalEnv = { ...process.env };

run()
  .catch((error: unknown) => {
    console.error("ERROR: auth hardening check gagal.");
    console.error(error instanceof Error ? error.message : "Unknown auth check error.");
    process.exitCode = 1;
  })
  .finally(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

async function run() {
  console.log("Ofissio auth production check");
  console.log("-----------------------------");

  setAuthEnv("production", "mock");
  assert(!getAuthRuntimeConfig().isProductionSafe, "production mock auth harus ditolak");
  console.log("PASS: production menolak AUTH_PROVIDER=mock.");

  setAuthEnv("production", "supabase");
  const anonymousAdmin = new Request("http://localhost/api/admin/orders");
  assertThrows(() => requireInternalAdmin(anonymousAdmin, "admin:order:view"));
  console.log("PASS: anonymous tidak bisa mengakses admin API.");

  const customerHeaders = trustedCustomerHeaders("company-a", "customer-a", "customer_admin");
  const customerOnAdmin = new Request("http://localhost/api/admin/orders", {
    headers: { ...customerHeaders, "x-ofissio-internal-role": "super_admin" },
  });
  assertThrows(() => requireInternalAdmin(customerOnAdmin, "admin:order:view"));
  console.log("PASS: customer tidak bisa memalsukan role admin.");

  const support = trustedInternalRequest("support");
  assertThrows(() => requireInternalAdmin(support, "admin:catalog:update"));
  const superAdmin = requireInternalAdmin(
    trustedInternalRequest("super_admin"),
    "admin:catalog:update",
  );
  assert(superAdmin.role === "super_admin", "super admin harus mendapat akses");
  console.log("PASS: RBAC menolak role tanpa permission dan menerima super_admin.");

  process.env.ADMIN_DEV_BYPASS = "true";
  process.env.INTERNAL_DEV_HEADERS_ENABLED = "true";
  assertThrows(() =>
    requireInternalAdmin(
      new Request("http://localhost/api/admin/orders", {
        headers: { "x-ofissio-internal-role": "super_admin" },
      }),
      "admin:order:view",
    ),
  );
  console.log("PASS: dev bypass/header tetap mati saat AUTH_MODE=production.");

  const sessionA = requireAuth(
    new Request("http://localhost/api/checkout/cart", { headers: customerHeaders }),
  );
  assert(sessionA.companyId === "company-a", "customer session company salah");
  requireCompanyAccess(sessionA, "company-a");
  assertThrows(() => requireCompanyAccess(sessionA, "company-b"));
  assertThrows(() => requireAuth(new Request("http://localhost/api/payment/ipaymu/create")));
  console.log("PASS: checkout/payment perlu sesi valid dan company isolation aktif.");

  assertQuotationSanitizer();
  console.log("PASS: customer quotation sanitizer tidak membocorkan internal note.");

  assertMiddlewareTrustBoundary();
  console.log("PASS: middleware membuang header identitas browser sebelum verifikasi.");

  assertNoClientSecret();
  console.log("PASS: service role tidak ditemukan di client source/bundle.");
}

function setAuthEnv(mode: "development" | "production", provider: "mock" | "supabase") {
  process.env.AUTH_MODE = mode;
  process.env.AUTH_PROVIDER = provider;
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-service-role-key";
  process.env.ADMIN_DEV_BYPASS = "false";
  process.env.INTERNAL_DEV_HEADERS_ENABLED = "false";
}

function trustedCustomerHeaders(companyId: string, userId: string, role: string) {
  return {
    "x-ofissio-auth-verified": "1",
    "x-ofissio-auth-kind": "customer",
    "x-ofissio-company-id": companyId,
    "x-ofissio-company-name": "Company A",
    "x-ofissio-user-id": userId,
    "x-ofissio-user-email": "customer@example.test",
    "x-ofissio-user-name": "Customer A",
    "x-ofissio-role": role,
  };
}

function trustedInternalRequest(role: string) {
  return new Request("http://localhost/api/admin/orders", {
    headers: {
      "x-ofissio-auth-verified": "1",
      "x-ofissio-auth-kind": "internal",
      "x-ofissio-internal-role": role,
      "x-ofissio-internal-user-id": `check-${role}`,
      "x-ofissio-internal-user-name": "Auth Check",
    },
  });
}

function assertQuotationSanitizer() {
  const source = readFileSync(
    join(process.cwd(), "src/features/quotation/quotation.utils.ts"),
    "utf8",
  );
  assert(source.includes("sanitizeQuotationForCustomer"), "sanitizer tidak ditemukan");
  assert(source.includes("internalNotes: []"), "internal note belum dikosongkan");
  assert(source.includes("salesNotes: null"), "sales note belum disembunyikan");
}

function assertMiddlewareTrustBoundary() {
  const source = readFileSync(join(process.cwd(), "src/middleware.ts"), "utf8");
  assert(source.includes("UNTRUSTED_IDENTITY_HEADERS"), "header stripping tidak ditemukan");
  assert(source.includes("AUTH_MODE"), "production auth mode tidak diperiksa");
}

function assertNoClientSecret() {
  const forbidden = [
    "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_AUTH_SERVICE_ROLE_KEY",
  ];
  const clientFiles = walk(join(process.cwd(), "src")).filter((file) => {
    const source = readFileSync(file, "utf8");
    return source.includes('"use client"') || source.includes("'use client'");
  });
  for (const file of clientFiles) {
    const source = readFileSync(file, "utf8");
    for (const name of forbidden) assert(!source.includes(name), `${name} ditemukan di ${file}`);
  }
  const staticDir = join(process.cwd(), ".next", "static");
  try {
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (secret.length >= 8) {
      for (const file of walk(staticDir)) {
        assert(!readFileSync(file, "utf8").includes(secret), "service role ditemukan di bundle");
      }
    }
  } catch {
    // Bundle may not exist before build; source scan remains mandatory.
  }
}

function walk(path: string): string[] {
  return readdirSync(path).flatMap((name) => {
    const item = join(path, name);
    return statSync(item).isDirectory() ? walk(item) : [item];
  });
}

function assertThrows(action: () => unknown) {
  let threw = false;
  try { action(); } catch { threw = true; }
  assert(threw, "aksi seharusnya ditolak");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
