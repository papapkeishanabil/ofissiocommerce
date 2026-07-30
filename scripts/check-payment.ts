import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const provider = process.env.PAYMENT_PROVIDER === "ipaymu" ? "ipaymu" : "mock";
const requiredIpaymuEnv = [
  "IPAYMU_ENABLED",
  "IPAYMU_VA",
  "IPAYMU_API_KEY",
  "IPAYMU_BASE_URL",
  "IPAYMU_CALLBACK_URL",
  "IPAYMU_RETURN_URL",
  "IPAYMU_CANCEL_URL",
  "IPAYMU_EXPIRE_MINUTES",
] as const;

run();

function run() {
  printHeader();
  assertNoPublicIpaymuSecret();
  console.log(`PAYMENT_PROVIDER=${provider}`);

  if (provider === "mock") {
    console.log("OK: mock payment mode aktif; iPaymu live call skipped.");
    console.log("OK: return/cancel/callback foundation can stay dormant in mock mode.");
    return;
  }

  const missing = requiredIpaymuEnv.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    console.log(`ERROR: Env iPaymu belum lengkap: ${missing.join(", ")}.`);
    process.exitCode = 1;
    return;
  }
  if (process.env.IPAYMU_ENABLED !== "true") {
    console.log("ERROR: IPAYMU_ENABLED harus true untuk PAYMENT_PROVIDER=ipaymu.");
    process.exitCode = 1;
    return;
  }
  if (!isValidHttpsOrLocal(process.env.IPAYMU_BASE_URL ?? "")) {
    console.log("ERROR: IPAYMU_BASE_URL tidak valid.");
    process.exitCode = 1;
    return;
  }
  for (const name of [
    "IPAYMU_CALLBACK_URL",
    "IPAYMU_RETURN_URL",
    "IPAYMU_CANCEL_URL",
  ] as const) {
    if (!isValidHttpsOrLocal(process.env[name] ?? "")) {
      console.log(`ERROR: ${name} tidak valid.`);
      process.exitCode = 1;
      return;
    }
  }
  if (process.env.PAYMENT_TEST_CREATE === "true") {
    console.log(
      "SKIP: PAYMENT_TEST_CREATE=true terdeteksi, tetapi script ini tidak membuat transaksi otomatis tanpa order staging eksplisit.",
    );
  }
  console.log("OK: iPaymu env lengkap untuk sandbox/staging.");
  console.log("OK: secret tidak dicetak dan tidak ada NEXT_PUBLIC_IPAYMU_API_KEY.");
  console.log("INFO: Create payment live hanya dilakukan oleh server route setelah admin/customer action.");
}

function printHeader() {
  const title = "Ofissio payment check";
  console.log(title);
  console.log("-".repeat(title.length));
}

function assertNoPublicIpaymuSecret() {
  const forbidden = [
    "NEXT_PUBLIC_IPAYMU_API_KEY",
    "NEXT_PUBLIC_IPAYMU_VA",
    "NEXT_PUBLIC_IPAYMU_SECRET",
  ];
  const found = forbidden.filter((name) => process.env[name]?.trim());
  if (found.length > 0) {
    console.log(`ERROR: Forbidden public payment secret: ${found.join(", ")}.`);
    process.exitCode = 1;
  }
}

function isValidHttpsOrLocal(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.hostname === "localhost";
  } catch {
    return false;
  }
}
