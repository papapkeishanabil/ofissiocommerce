import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), true);

type Level = "PASS" | "WARN" | "FAIL";
type Result = { level: Level; name: string; detail: string };

const results: Result[] = [];
const requiredGates = [
  "check:env",
  "check:auth",
  "check:supabase",
  "check:storage",
  "check:rls",
  "check:woocommerce-stock",
  "check:woocommerce-product-standard",
  "check:payment",
  "check:shipping",
  "check:production-readiness",
] as const;

console.log("Ofissio staging release candidate gate");
console.log("======================================");

checkSafeEnvironment();
checkRepositorySafety();
checkClientBundleSecrets();
checkExpectedStagingWarnings();
runRequiredGates();
printSummary();

function checkSafeEnvironment() {
  const requiredFalse = [
    "STOCK_CUSTOMER_VISIBILITY",
    "GINEE_TEST_LIVE",
    "WOOCOMMERCE_TEST_WRITE",
    "IPAYMU_TEST_CREATE_PAYMENT",
    "BITESHIP_TEST_CREATE_SHIPMENT",
  ] as const;

  for (const name of requiredFalse) {
    const value = process.env[name]?.trim().toLowerCase();
    if (value === "false") {
      add("PASS", name, "false");
    } else {
      add("FAIL", name, "wajib diset eksplisit false untuk staging RC");
    }
  }
}

function checkRepositorySafety() {
  const tracked = spawnSync("git", ["ls-files", "--error-unmatch", ".env.local"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "ignore",
  });

  if (tracked.status === 0) {
    add("FAIL", ".env.local tracking", ".env.local terdeteksi tracked oleh Git");
  } else {
    add("PASS", ".env.local tracking", "tidak tracked oleh Git");
  }

  const publicSecretNames = [
    "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET",
    "NEXT_PUBLIC_IPAYMU_API_KEY",
    "NEXT_PUBLIC_BITESHIP_API_KEY",
    "NEXT_PUBLIC_SMTP_PASSWORD",
    "NEXT_PUBLIC_WORDPRESS_MEDIA_APP_PASSWORD",
  ];
  const configured = publicSecretNames.filter((name) => Boolean(process.env[name]?.trim()));
  if (configured.length > 0) {
    add("FAIL", "Public secret environment", `${configured.join(", ")} tidak boleh dikonfigurasi`);
  } else {
    add("PASS", "Public secret environment", "tidak ada server secret dengan prefix NEXT_PUBLIC");
  }
}

function checkClientBundleSecrets() {
  const staticDir = join(process.cwd(), ".next", "static");
  if (!existsSync(staticDir)) {
    add(
      "WARN",
      "Client bundle secret scan",
      ".next/static belum tersedia; jalankan kembali setelah build final",
    );
    return;
  }

  const secretNames = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "WOOCOMMERCE_CONSUMER_SECRET",
    "IPAYMU_API_KEY",
    "BITESHIP_API_KEY",
    "SMTP_PASSWORD",
    "WORDPRESS_MEDIA_APP_PASSWORD",
    "WORDPRESS_MEDIA_TOKEN",
    "RESEND_API_KEY",
    "GINEE_SECRET_KEY",
  ];
  const configuredSecrets = secretNames
    .map((name) => ({ name, value: process.env[name]?.trim() ?? "" }))
    .filter(({ value }) => value.length >= 12 && !isPlaceholder(value));
  const bundleFiles = listFiles(staticDir);
  const leaked = new Set<string>();

  for (const file of bundleFiles) {
    const contents = readFileSync(file, "utf8");
    for (const secret of configuredSecrets) {
      if (contents.includes(secret.value)) leaked.add(secret.name);
    }
  }

  if (leaked.size > 0) {
    add(
      "FAIL",
      "Client bundle secret scan",
      `nilai secret ditemukan untuk: ${Array.from(leaked).join(", ")}`,
    );
  } else {
    add(
      "PASS",
      "Client bundle secret scan",
      `${bundleFiles.length} file diperiksa; tidak ada nilai secret server ditemukan`,
    );
  }
}

function checkExpectedStagingWarnings() {
  const paymentProvider = normalized("PAYMENT_PROVIDER");
  const paymentMode = normalized("IPAYMU_MODE") || normalized("PAYMENT_MODE");
  if (paymentProvider === "ipaymu" && paymentMode !== "live") {
    add("WARN", "iPaymu staging mode", "sandbox aktif; diperbolehkan hanya untuk staging RC");
  }

  const shippingProvider = normalized("SHIPPING_PROVIDER");
  const shippingMode = normalized("BITESHIP_MODE") || normalized("SHIPPING_MODE");
  if (shippingProvider === "biteship" && shippingMode !== "live") {
    add("WARN", "Biteship staging mode", "sandbox aktif; diperbolehkan hanya untuk staging RC");
  }

  const legalStatus = normalized("LEGAL_APPROVAL_STATUS") || "draft";
  if (!(["draft", "internal_review", "approved"] as const).includes(legalStatus as never)) {
    add("FAIL", "Legal approval", "nilai harus draft, internal_review, atau approved");
  } else if (legalStatus !== "approved") {
    add(
      "WARN",
      "Legal approval",
      `${legalStatus}; diperbolehkan untuk staging RC tetapi memblokir live production`,
    );
  }
}

function runRequiredGates() {
  for (const script of requiredGates) {
    console.log(`\n> npm run ${script}`);
    const run = runNpmScript(script);
    if (run.status === 0) {
      add("PASS", `npm run ${script}`, "exit code 0");
    } else {
      add("FAIL", `npm run ${script}`, `exit code ${run.status ?? "unknown"}`);
    }
  }
}

function runNpmScript(script: string) {
  const env = { ...process.env, APP_ENV: "staging" };
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath) {
    return spawnSync(process.execPath, [npmExecPath, "run", script], {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
    });
  }

  return spawnSync("npm", ["run", script], {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

function printSummary() {
  const counts = {
    PASS: results.filter((result) => result.level === "PASS").length,
    WARN: results.filter((result) => result.level === "WARN").length,
    FAIL: results.filter((result) => result.level === "FAIL").length,
  };

  console.log("\nStaging RC summary");
  console.log("==================");
  for (const result of results) {
    console.log(`[${result.level}] ${result.name}: ${result.detail}`);
  }
  console.log(`\n${counts.PASS} PASS, ${counts.WARN} WARN, ${counts.FAIL} FAIL`);

  if (counts.FAIL > 0) {
    console.log("Final status: NO_GO");
    process.exitCode = 1;
    return;
  }
  if (counts.WARN > 0) {
    console.log("Final status: CONDITIONAL_GO (staging release candidate)");
    return;
  }
  console.log("Final status: GO (staging release candidate)");
}

function add(level: Level, name: string, detail: string) {
  results.push({ level, name, detail });
}

function normalized(name: string) {
  return process.env[name]?.trim().toLowerCase() ?? "";
}

function isPlaceholder(value: string) {
  const normalizedValue = value.toLowerCase();
  return ["example", "replace", "change-me", "changeme", "your-", "dummy"].some((token) =>
    normalizedValue.includes(token),
  );
}

function listFiles(directory: string): string[] {
  const output: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) output.push(...listFiles(path));
    else output.push(path);
  }
  return output;
}
