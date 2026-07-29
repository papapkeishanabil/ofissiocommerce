type AppEnvironment = "development" | "staging" | "production";
type CheckLevel = "error" | "warning";

interface EnvRule {
  name: string;
  requiredIn?: AppEnvironment[];
  secret?: boolean;
  note?: string;
}

const appEnv = resolveAppEnvironment();

const rules: EnvRule[] = [
  { name: "APP_URL", requiredIn: ["staging", "production"] },
  { name: "NODE_ENV" },
  { name: "PRODUCT_SOURCE" },
  { name: "DATABASE_PROVIDER" },
  { name: "DATABASE_URL", secret: true },
  { name: "NEXT_PUBLIC_SUPABASE_URL" },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", secret: true },
  { name: "AUTH_PROVIDER" },
  { name: "AUTH_SESSION_COOKIE_NAME" },
  { name: "STORAGE_PROVIDER" },
  { name: "STORAGE_BUCKET_LOGOS" },
  { name: "STORAGE_BUCKET_ARTWORK" },
  { name: "STORAGE_BUCKET_DOCUMENTS" },
  { name: "STORAGE_BUCKET_3D" },
  { name: "STORAGE_SIGNED_URL_EXPIRES_SECONDS" },
  { name: "MAX_LOGO_UPLOAD_MB" },
  { name: "MAX_DOCUMENT_UPLOAD_MB" },
  { name: "MAX_GLB_UPLOAD_MB" },
  { name: "WOOCOMMERCE_ENABLED" },
  { name: "WOOCOMMERCE_BASE_URL" },
  { name: "WOOCOMMERCE_CONSUMER_KEY", secret: true },
  { name: "WOOCOMMERCE_CONSUMER_SECRET", secret: true },
  { name: "WOOCOMMERCE_SYNC_ORDERS" },
  { name: "PAYMENT_PROVIDER" },
  { name: "IPAYMU_VA", secret: true },
  { name: "IPAYMU_API_KEY", secret: true },
  { name: "IPAYMU_BASE_URL" },
  { name: "IPAYMU_CALLBACK_URL" },
  { name: "IPAYMU_RETURN_URL" },
  { name: "IPAYMU_CANCEL_URL" },
  { name: "SHIPPING_PROVIDER" },
  { name: "DEFAULT_ORIGIN_CITY", requiredIn: ["staging", "production"] },
  { name: "DEFAULT_ORIGIN_POSTAL_CODE", requiredIn: ["production"] },
  { name: "SHIPPING_PROVIDER_API_KEY", secret: true },
  { name: "EMAIL_PROVIDER" },
  { name: "EMAIL_ENABLED" },
  { name: "EMAIL_FROM" },
  { name: "EMAIL_REPLY_TO" },
  { name: "SALES_QUOTATION_EMAIL" },
  { name: "RESEND_API_KEY", secret: true },
  { name: "AUTH_SECRET", requiredIn: ["production"], secret: true },
  { name: "NEXTAUTH_SECRET", requiredIn: ["production"], secret: true },
  { name: "LOG_LEVEL" },
];

const forbiddenPublicSecrets = [
  "NEXT_PUBLIC_RESEND_API_KEY",
  "NEXT_PUBLIC_IPAYMU_API_KEY",
  "NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET",
  "NEXT_PUBLIC_WOO_CONSUMER_SECRET",
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_STORAGE_SECRET",
  "NEXT_PUBLIC_S3_SECRET_ACCESS_KEY",
  "NEXT_PUBLIC_R2_SECRET_ACCESS_KEY",
];

const problems: { level: CheckLevel; message: string }[] = [];

for (const rule of rules) {
  const value = process.env[rule.name]?.trim();
  if (rule.requiredIn?.includes(appEnv) && !value) {
    problems.push({
      level: appEnv === "production" ? "error" : "warning",
      message: `${rule.name} belum diisi untuk ${appEnv}.`,
    });
  }
  if (rule.secret && rule.name.startsWith("NEXT_PUBLIC_")) {
    problems.push({
      level: "error",
      message: `${rule.name} adalah secret dan tidak boleh memakai NEXT_PUBLIC_.`,
    });
  }
}

for (const name of forbiddenPublicSecrets) {
  if (process.env[name]) {
    problems.push({
      level: "error",
      message: `${name} tidak boleh diset karena akan bocor ke client bundle.`,
    });
  }
}

if (process.env.PRODUCT_SOURCE === "woocommerce") {
  for (const name of [
    "WOOCOMMERCE_ENABLED",
    "WOOCOMMERCE_BASE_URL",
    "WOOCOMMERCE_CONSUMER_KEY",
    "WOOCOMMERCE_CONSUMER_SECRET",
  ]) {
    if (!process.env[name]?.trim()) {
      problems.push({
        level: appEnv === "development" ? "warning" : "error",
        message: `${name} wajib untuk PRODUCT_SOURCE=woocommerce.`,
      });
    }
  }
}

if (process.env.PAYMENT_PROVIDER === "ipaymu") {
  for (const name of [
    "IPAYMU_VA",
    "IPAYMU_API_KEY",
    "IPAYMU_BASE_URL",
    "IPAYMU_CALLBACK_URL",
    "IPAYMU_RETURN_URL",
    "IPAYMU_CANCEL_URL",
  ]) {
    if (!process.env[name]?.trim()) {
      problems.push({
        level: appEnv === "development" ? "warning" : "error",
        message: `${name} wajib untuk PAYMENT_PROVIDER=ipaymu.`,
      });
    }
  }
  problems.push({
    level: "warning",
    message:
      "PAYMENT_PROVIDER=ipaymu masih foundation; live signature/callback perlu verifikasi staging sebelum production.",
  });
}

if (process.env.EMAIL_PROVIDER === "resend") {
  for (const name of ["RESEND_API_KEY", "EMAIL_FROM", "SALES_QUOTATION_EMAIL"]) {
    if (!process.env[name]?.trim()) {
      problems.push({
        level: appEnv === "development" ? "warning" : "error",
        message: `${name} wajib untuk EMAIL_PROVIDER=resend.`,
      });
    }
  }
  if (process.env.EMAIL_ENABLED !== "true") {
    problems.push({
      level: "warning",
      message:
        "EMAIL_PROVIDER=resend aktif, tetapi EMAIL_ENABLED belum true. Email production akan diskip.",
    });
  }
}

if (process.env.EMAIL_PROVIDER === "mock" && process.env.EMAIL_ENABLED === "true") {
  problems.push({
    level: "warning",
    message:
      "EMAIL_ENABLED=true dengan EMAIL_PROVIDER=mock hanya mencatat email ke mock log, bukan mengirim real.",
  });
}

if (process.env.DATABASE_PROVIDER === "supabase") {
  for (const name of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]) {
    if (!process.env[name]?.trim()) {
      problems.push({
        level: appEnv === "development" ? "warning" : "error",
        message: `${name} wajib untuk DATABASE_PROVIDER=supabase.`,
      });
    }
  }
}

if (process.env.DATABASE_PROVIDER === "postgres" && !process.env.DATABASE_URL?.trim()) {
  problems.push({
    level: appEnv === "development" ? "warning" : "error",
    message: "DATABASE_URL wajib untuk DATABASE_PROVIDER=postgres.",
  });
}

if (process.env.STORAGE_PROVIDER === "supabase") {
  for (const name of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "STORAGE_BUCKET_LOGOS",
    "STORAGE_BUCKET_ARTWORK",
    "STORAGE_BUCKET_DOCUMENTS",
    "STORAGE_BUCKET_3D",
  ]) {
    if (!process.env[name]?.trim()) {
      problems.push({
        level: appEnv === "development" ? "warning" : "error",
        message: `${name} wajib untuk STORAGE_PROVIDER=supabase. Development akan fallback ke mock.`,
      });
    }
  }
}

if (process.env.SHIPPING_PROVIDER && process.env.SHIPPING_PROVIDER !== "mock") {
  for (const name of [
    "DEFAULT_ORIGIN_CITY",
    "DEFAULT_ORIGIN_POSTAL_CODE",
    "SHIPPING_PROVIDER_API_KEY",
  ]) {
    if (!process.env[name]?.trim()) {
      problems.push({
        level: appEnv === "development" ? "warning" : "error",
        message: `${name} wajib untuk SHIPPING_PROVIDER=${process.env.SHIPPING_PROVIDER}.`,
      });
    }
  }
}

if (process.env.STORAGE_PROVIDER === "s3") {
  problems.push({
    level: "warning",
    message:
      "STORAGE_PROVIDER=s3 masih boundary Phase 12; SDK/credential S3/R2 belum diaktifkan.",
  });
}

printReport();

if (problems.some((problem) => problem.level === "error")) {
  process.exitCode = 1;
}

function resolveAppEnvironment(): AppEnvironment {
  const explicit = process.env.APP_ENV?.toLowerCase();
  if (explicit === "staging" || explicit === "production" || explicit === "development") {
    return explicit;
  }
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

function printReport() {
  const title = `Ofissio env check (${appEnv})`;
  console.log(title);
  console.log("-".repeat(title.length));

  if (problems.length === 0) {
    console.log("OK: konfigurasi env dasar aman untuk mode ini.");
    return;
  }

  for (const problem of problems) {
    const label = problem.level === "error" ? "ERROR" : "WARN";
    console.log(`${label}: ${problem.message}`);
  }
}
