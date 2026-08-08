import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { loadEnvConfig } from "@next/env";

import { getAuthRuntimeConfig } from "../src/features/auth/auth.config";
import { getCarrierShippingConfig } from "../src/features/carrier-shipping/carrier-shipping.config";
import { getCommerceRuntimeConfig } from "../src/features/commerce/commerce.config";
import { getDatabaseHealth } from "../src/features/database/database.health";
import { getPaymentRuntimeConfig } from "../src/features/payment/payment.config";
import { getStorageRuntimeConfig } from "../src/features/storage/storage.config";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

type Level = "PASS" | "WARN" | "FAIL";
type Result = { level: Level; name: string; detail: string };
type RlsRow = { table_name: string; rls_enabled: boolean; rls_forced: boolean };
type ReadinessDecision = "GO" | "CONDITIONAL_GO" | "NO_GO";

const results: Result[] = [];
const environment = resolveEnvironment();
const production = environment === "production";
const stagingReadiness = environment === "staging" || production;

run().catch((error: unknown) => {
  add("FAIL", "Production readiness checker", safeReason(error));
  printResults();
  process.exitCode = 1;
});

async function run() {
  console.log(`Ofissio production readiness (${environment})`);
  console.log("-".repeat(42 + environment.length));

  checkRuntimeFlags();
  checkStaticSecurityContracts();
  checkRepositorySafety();

  const [database, rls, buckets] = await Promise.all([
    checkDatabase(),
    checkRlsInventory(),
    checkPrivateBuckets(),
  ]);
  void database;
  void rls;
  void buckets;

  printResults();
  if (results.some((result) => result.level === "FAIL")) process.exitCode = 1;
}

function checkRuntimeFlags() {
  const auth = getAuthRuntimeConfig();
  const payment = getPaymentRuntimeConfig();
  const shipping = getCarrierShippingConfig();
  const commerce = getCommerceRuntimeConfig();
  const storage = getStorageRuntimeConfig();

  expectProductionValue("AUTH_PROVIDER", auth.provider, "supabase");
  expectProductionValue("AUTH_MODE", auth.mode, "production");
  expectSafeBoolean("ADMIN_DEV_BYPASS", process.env.ADMIN_DEV_BYPASS, false);
  expectSafeBoolean(
    "INTERNAL_DEV_HEADERS_ENABLED",
    process.env.INTERNAL_DEV_HEADERS_ENABLED,
    false,
  );

  expectProductionValue("PAYMENT_PROVIDER", payment.provider, "ipaymu");
  expectSafeBoolean(
    "IPAYMU_TEST_CREATE_PAYMENT",
    process.env.IPAYMU_TEST_CREATE_PAYMENT,
    false,
  );
  if (payment.provider === "ipaymu") {
    if (!payment.ipaymu.isComplete) {
      add(production ? "FAIL" : "WARN", "iPaymu configuration", "konfigurasi provider belum lengkap");
    } else if (payment.ipaymu.mode === "live" && payment.ipaymu.paymentMode === "live") {
      add("PASS", "iPaymu configuration", "live dikonfigurasi eksplisit");
    } else {
      add(production ? "FAIL" : "WARN", "iPaymu mode", "sandbox aktif; transaksi live belum diaktifkan");
    }
  }

  expectProductionValue("SHIPPING_PROVIDER", shipping.provider, "biteship");
  expectSafeBoolean(
    "BITESHIP_TEST_CREATE_SHIPMENT",
    process.env.BITESHIP_TEST_CREATE_SHIPMENT,
    false,
  );
  if (shipping.provider === "biteship") {
    if (!shipping.biteship.isConfigured) {
      add(production ? "FAIL" : "WARN", "Biteship configuration", "konfigurasi origin/provider belum lengkap");
    } else if (shipping.mode === "live" && shipping.biteship.mode === "live") {
      add("PASS", "Biteship configuration", "live dikonfigurasi eksplisit");
    } else {
      add(production ? "FAIL" : "WARN", "Biteship mode", "sandbox aktif; shipment live belum diaktifkan");
    }
  }

  expectProductionValue("STORAGE_PROVIDER", storage.provider, "supabase");
  expectSafeBoolean(
    "STOCK_CUSTOMER_VISIBILITY",
    process.env.STOCK_CUSTOMER_VISIBILITY,
    false,
  );
  checkGineeSafety();

  checkExplicitBoolean("WOOCOMMERCE_SYNC_ORDERS", process.env.WOOCOMMERCE_SYNC_ORDERS);
  checkExplicitBoolean("WOOCOMMERCE_TEST_WRITE", process.env.WOOCOMMERCE_TEST_WRITE);
  if (process.env.WOOCOMMERCE_TEST_WRITE === "true") {
    add(
      stagingReadiness ? "FAIL" : "WARN",
      "WooCommerce test write",
      "aktif; staging/production readiness mewajibkan false",
    );
  } else if (process.env.WOOCOMMERCE_TEST_WRITE === "false") {
    add("PASS", "WooCommerce test write", "disabled");
  }

  if (commerce.woocommerce.isConfigured) {
    add("PASS", "WooCommerce server configuration", "credential server terdeteksi");
  } else {
    add(production ? "FAIL" : "WARN", "WooCommerce server configuration", "belum lengkap");
  }

  checkLegalApproval();
}

function checkGineeSafety() {
  const gineeEnabled = process.env.GINEE_ENABLED?.trim().toLowerCase() === "true";
  const testLive = process.env.GINEE_TEST_LIVE?.trim().toLowerCase();

  if (!gineeEnabled && (testLive === undefined || testLive === "" || testLive === "false")) {
    add("PASS", "GINEE_TEST_LIVE", "false/disabled; Ginee bukan flow utama");
    return;
  }
  if (testLive === "false") {
    add("PASS", "GINEE_TEST_LIVE", "false");
    return;
  }
  if (!testLive) {
    add("WARN", "GINEE_TEST_LIVE", "belum eksplisit false saat Ginee enabled");
    return;
  }
  add("FAIL", "GINEE_TEST_LIVE", `${testLive}; wajib false untuk release readiness`);
}

function checkLegalApproval() {
  const status = process.env.LEGAL_APPROVAL_STATUS?.trim().toLowerCase() || "draft";
  const supported = ["draft", "internal_review", "approved"];

  if (!supported.includes(status)) {
    add("FAIL", "Legal approval", `${status}; nilai harus draft, internal_review, atau approved`);
    return;
  }
  if (status === "approved") {
    add("PASS", "Legal approval", "approved; bukti review tetap disimpan di luar aplikasi");
    return;
  }
  add(
    production ? "FAIL" : "WARN",
    "Legal approval",
    `${status}; final legal review berada di luar aplikasi dan belum disetujui`,
  );
}

async function checkDatabase() {
  const health = await getDatabaseHealth();
  if (health.status === "connected" && health.schemaStatus === "ready") {
    add("PASS", "Supabase database", "connected; schema ready");
    return true;
  }
  add(
    production || health.requestedProvider === "supabase" ? "FAIL" : "WARN",
    "Supabase database",
    `${health.status}; schema ${health.schemaStatus}`,
  );
  return false;
}

async function checkRlsInventory() {
  const config = supabaseConfig();
  if (!config) {
    add(production ? "FAIL" : "WARN", "RLS live inventory", "Supabase service configuration tidak tersedia");
    return false;
  }
  try {
    const response = await fetch(`${config.baseUrl}/rest/v1/rpc/ofissio_rls_security_inventory`, {
      method: "POST",
      headers: serviceHeaders(config.serviceRoleKey),
      body: "{}",
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`inventory_http_${response.status}`);
    const rows = (await response.json()) as RlsRow[];
    const invalid = rows.filter((row) => !row.rls_enabled || !row.rls_forced);
    if (rows.length === 0 || invalid.length > 0) {
      add("FAIL", "RLS live inventory", `${invalid.length || "semua"} tabel belum enabled + forced`);
      return false;
    }
    add("PASS", "RLS live inventory", `${rows.length} tabel enabled + forced`);
    return true;
  } catch (error) {
    add(production ? "FAIL" : "WARN", "RLS live inventory", safeReason(error));
    return false;
  }
}

async function checkPrivateBuckets() {
  const config = supabaseConfig();
  if (!config) {
    add(production ? "FAIL" : "WARN", "Private storage buckets", "Supabase service configuration tidak tersedia");
    return false;
  }
  try {
    const response = await fetch(`${config.baseUrl}/storage/v1/bucket`, {
      headers: serviceHeaders(config.serviceRoleKey),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`bucket_http_${response.status}`);
    const rows = (await response.json()) as Array<{ id?: string; name?: string; public?: boolean }>;
    const required = [
      process.env.STORAGE_BUCKET_LOGOS || "ofissio-logos",
      process.env.STORAGE_BUCKET_ARTWORK || "ofissio-artwork",
      process.env.STORAGE_BUCKET_DOCUMENTS || "ofissio-documents",
      process.env.STORAGE_BUCKET_3D || "ofissio-3d-models",
    ];
    const missing = required.filter(
      (bucket) => !rows.some((row) => (row.id === bucket || row.name === bucket) && row.public === false),
    );
    if (missing.length > 0) {
      add(production ? "FAIL" : "WARN", "Private storage buckets", `${missing.length} bucket belum ditemukan/private`);
      return false;
    }
    add("PASS", "Private storage buckets", `${required.length} bucket private`);
    return true;
  } catch (error) {
    add(production ? "FAIL" : "WARN", "Private storage buckets", safeReason(error));
    return false;
  }
}

function checkStaticSecurityContracts() {
  const rateLimitedRoutes = [
    "src/app/api/auth/login/route.ts",
    "src/app/api/auth/register/route.ts",
    "src/app/api/quotation/request/route.ts",
    "src/app/api/quotation/custom-request/route.ts",
    "src/app/api/files/upload/route.ts",
    "src/app/api/payment/ipaymu/create/route.ts",
    "src/app/api/payment/ipaymu/callback/route.ts",
    "src/app/api/shipping/rates/route.ts",
    "src/app/api/shipping/create-shipment/route.ts",
    "src/app/api/shipping/biteship/webhook/route.ts",
    "src/app/api/admin/orders/route.ts",
    "src/app/api/admin/quotations/route.ts",
  ];
  const missingRateLimit = rateLimitedRoutes.filter(
    (path) => !source(path).includes("rateLimitOrThrow"),
  );
  add(
    missingRateLimit.length === 0 ? "PASS" : "FAIL",
    "Rate-limit coverage",
    missingRateLimit.length === 0 ? `${rateLimitedRoutes.length} critical routes` : missingRateLimit.join(", "),
  );

  const auditedSources = [
    "src/app/api/auth/login/route.ts",
    "src/app/api/auth/register/route.ts",
    "src/app/api/payment/ipaymu/callback/route.ts",
    "src/features/carrier-shipping/carrier-shipping.service.ts",
    "src/features/documents/document.service.ts",
    "src/features/email/email.service.ts",
    "src/features/orders/woocommerce-order-sync.service.ts",
  ];
  const missingAudit = auditedSources.filter(
    (path) => !/log(?:Audit|Security|Payment)Event/.test(source(path)),
  );
  add(
    missingAudit.length === 0 ? "PASS" : "FAIL",
    "Audit-log coverage",
    missingAudit.length === 0 ? "auth, payment, shipping, document, email, dan Woo sync" : missingAudit.join(", "),
  );

  const uploadRoute = source("src/app/api/files/upload/route.ts");
  const uploadService = source("src/features/storage/storage.service.ts");
  add(
    uploadRoute.includes("uploadFormSchema") &&
      uploadRoute.includes("requireFileUploadRole") &&
      /validate|assert/i.test(uploadService),
    "Upload validation",
    "schema, role, file type/size validation",
  );

  const paymentService = source("src/features/payment/payment.webhook.ts");
  const shippingService = source("src/features/carrier-shipping/carrier-shipping.service.ts");
  add(
    paymentService.includes("idempotent") && shippingService.includes("idempotent"),
    "Provider idempotency",
    "payment callback dan shipment/webhook memiliki guard duplicate",
  );

  const legalRoutes = [
    "privacy-policy",
    "terms-of-service",
    "refund-policy",
    "shipping-policy",
  ];
  const legalContent = source("src/features/legal/legal-documents.ts");
  add(
    legalRoutes.every((slug) => legalContent.includes(`slug: \"${slug}\"`)),
    "Legal pages",
    "4 dokumen legal tersedia melalui route /legal/[slug]",
  );
}

function checkRepositorySafety() {
  const trackedEnv = spawnSync("git", ["ls-files", "--error-unmatch", ".env.local"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  add(
    trackedEnv.status !== 0,
    ".env.local tracking",
    trackedEnv.status === 0 ? "FAIL: .env.local terdaftar di Git" : "tidak tracked",
  );

  const forbiddenPublicNames = [
    "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_IPAYMU_API_KEY",
    "NEXT_PUBLIC_BITESHIP_API_KEY",
    "NEXT_PUBLIC_BITESHIP_WEBHOOK_SECRET",
    "NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET",
    "NEXT_PUBLIC_SMTP_PASSWORD",
  ];
  const clientLeak = walk(join(process.cwd(), "src")).find((path) => {
    const value = readFileSync(path, "utf8");
    if (!value.includes('"use client"') && !value.includes("'use client'")) return false;
    return forbiddenPublicNames.some((name) => value.includes(name));
  });
  add(!clientLeak, "Client source secret scan", clientLeak ? clientLeak : "tidak ada public secret reference");

  const secretValues = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.IPAYMU_API_KEY,
    process.env.BITESHIP_API_KEY,
    process.env.BITESHIP_WEBHOOK_SECRET,
    process.env.WOOCOMMERCE_CONSUMER_SECRET,
    process.env.SMTP_PASSWORD,
  ].filter((value): value is string => Boolean(value && value.length >= 12));
  const staticDir = join(process.cwd(), ".next", "static");
  if (!existsSync(staticDir)) {
    add("WARN", "Client bundle secret scan", ".next/static belum tersedia; jalankan ulang setelah build");
    return;
  }
  const leakedBundle = walk(staticDir).find((path) => {
    const value = readFileSync(path, "utf8");
    return secretValues.some((secret) => value.includes(secret));
  });
  add(!leakedBundle, "Client bundle secret scan", leakedBundle ? leakedBundle : "tidak ada secret runtime");
}

function expectProductionValue(name: string, actual: string, expected: string) {
  if (actual === expected) {
    add("PASS", name, expected);
  } else {
    add(production ? "FAIL" : "WARN", name, `${actual || "unset"}; production membutuhkan ${expected}`);
  }
}

function expectSafeBoolean(
  name: string,
  value: string | undefined,
  expected: boolean,
  explicitInProduction = false,
) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === String(expected)) {
    add("PASS", name, String(expected));
    return;
  }
  if (!normalized && !production && explicitInProduction) {
    add("WARN", name, `unset; runtime tetap ${expected}, tetapi production harus eksplisit`);
    return;
  }
  add("FAIL", name, `${normalized || "unset"}; wajib ${expected}`);
}

function checkExplicitBoolean(name: string, value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  add(
    normalized === "true" || normalized === "false",
    name,
    normalized === "true" || normalized === "false" ? `explicit ${normalized}` : "harus explicit true/false",
  );
}

function supabaseConfig() {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !serviceRoleKey) return null;
  return { baseUrl, serviceRoleKey };
}

function serviceHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

function source(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function walk(path: string): string[] {
  if (!existsSync(path)) return [];
  return readdirSync(path).flatMap((name) => {
    const item = join(path, name);
    return statSync(item).isDirectory() ? walk(item) : [item];
  });
}

function resolveEnvironment() {
  const explicit = process.env.APP_ENV?.trim().toLowerCase();
  if (["development", "staging", "production"].includes(explicit ?? "")) return explicit!;
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

function add(level: Level | boolean, name: string, detail: string) {
  results.push({ level: typeof level === "boolean" ? (level ? "PASS" : "FAIL") : level, name, detail });
}

function printResults() {
  for (const result of results) console.log(`${result.level}: ${result.name} — ${result.detail}`);
  const counts = {
    pass: results.filter((result) => result.level === "PASS").length,
    warn: results.filter((result) => result.level === "WARN").length,
    fail: results.filter((result) => result.level === "FAIL").length,
  };
  console.log(`Summary: ${counts.pass} PASS, ${counts.warn} WARN, ${counts.fail} FAIL`);
  const decision = resolveDecision(counts.warn, counts.fail);
  const scope =
    decision === "CONDITIONAL_GO"
      ? "staging only; live production tetap NO_GO sampai seluruh WARN produksi ditutup"
      : environment;
  console.log(`Final status: ${decision} (${scope})`);
}

function resolveDecision(warnCount: number, failCount: number): ReadinessDecision {
  if (failCount > 0) return "NO_GO";
  if (warnCount > 0) return "CONDITIONAL_GO";
  return "GO";
}

function safeReason(error: unknown) {
  if (!(error instanceof Error)) return "unknown_error";
  return error.message.replace(
    /(api[_-]?key|secret|token|password|signature|authorization)=?[^\s,]*/gi,
    "$1=[redacted]",
  );
}
