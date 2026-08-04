type AppEnvironment = "development" | "staging" | "production";
type CheckLevel = "error" | "warning";

interface EnvRule {
  name: string;
  requiredIn?: AppEnvironment[];
  secret?: boolean;
  note?: string;
}

const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

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
  { name: "AUTH_MODE" },
  { name: "AUTH_REQUIRE_EMAIL_VERIFICATION" },
  { name: "ADMIN_DEV_BYPASS" },
  { name: "INTERNAL_DEV_HEADERS_ENABLED" },
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
  { name: "SUPABASE_STORAGE_MAX_FILE_MB" },
  { name: "PRODUCT_IMAGE_MAX_MB" },
  { name: "WOOCOMMERCE_ENABLED" },
  { name: "WOOCOMMERCE_BASE_URL" },
  { name: "WOOCOMMERCE_CONSUMER_KEY", secret: true },
  { name: "WOOCOMMERCE_CONSUMER_SECRET", secret: true },
  { name: "WOOCOMMERCE_SYNC_ORDERS" },
  { name: "WOOCOMMERCE_TEST_WRITE" },
  { name: "WORDPRESS_MEDIA_BASE_URL" },
  { name: "WORDPRESS_MEDIA_USERNAME" },
  { name: "WORDPRESS_MEDIA_APP_PASSWORD", secret: true },
  { name: "WORDPRESS_MEDIA_TOKEN", secret: true },
  { name: "PAYMENT_PROVIDER" },
  { name: "PAYMENT_MODE" },
  { name: "IPAYMU_ENABLED" },
  { name: "IPAYMU_MODE" },
  { name: "IPAYMU_VA", secret: true },
  { name: "IPAYMU_API_KEY", secret: true },
  { name: "IPAYMU_BASE_URL" },
  { name: "IPAYMU_CALLBACK_URL" },
  { name: "IPAYMU_NOTIFY_URL" },
  { name: "IPAYMU_RETURN_URL" },
  { name: "IPAYMU_CANCEL_URL" },
  { name: "IPAYMU_EXPIRE_MINUTES" },
  { name: "IPAYMU_TEST_CREATE_PAYMENT" },
  { name: "SHIPPING_PROVIDER" },
  { name: "DEFAULT_ORIGIN_CITY", requiredIn: ["staging", "production"] },
  { name: "DEFAULT_ORIGIN_POSTAL_CODE", requiredIn: ["production"] },
  { name: "SHIPPING_PROVIDER_API_KEY", secret: true },
  { name: "EMAIL_PROVIDER" },
  { name: "EMAIL_ENABLED" },
  { name: "EMAIL_FROM" },
  { name: "EMAIL_REPLY_TO" },
  { name: "SALES_QUOTATION_EMAIL" },
  { name: "ORDER_NOTIFICATION_EMAIL_ENABLED" },
  { name: "ORDER_NOTIFICATION_EMAILS" },
  { name: "EMAIL_TEST_SEND" },
  { name: "EMAIL_TEST_TO" },
  { name: "RESEND_API_KEY", secret: true },
  { name: "SMTP_HOST" },
  { name: "SMTP_PORT" },
  { name: "SMTP_SECURE" },
  { name: "SMTP_USER" },
  { name: "SMTP_PASSWORD", secret: true },
  { name: "AUTH_SECRET", requiredIn: ["production"], secret: true },
  { name: "NEXTAUTH_SECRET", requiredIn: ["production"], secret: true },
  { name: "LOG_LEVEL" },
];

const forbiddenPublicSecrets = [
  "NEXT_PUBLIC_RESEND_API_KEY",
  "NEXT_PUBLIC_SMTP_PASSWORD",
  "NEXT_PUBLIC_IPAYMU_API_KEY",
  "NEXT_PUBLIC_IPAYMU_VA",
  "NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET",
  "NEXT_PUBLIC_WOO_CONSUMER_SECRET",
  "NEXT_PUBLIC_WORDPRESS_MEDIA_USERNAME",
  "NEXT_PUBLIC_WORDPRESS_MEDIA_APP_PASSWORD",
  "NEXT_PUBLIC_WORDPRESS_MEDIA_TOKEN",
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

const authMode = process.env.AUTH_MODE?.trim().toLowerCase() || "development";
const authProvider = process.env.AUTH_PROVIDER?.trim().toLowerCase() || "mock";
if (!["development", "production"].includes(authMode)) {
  problems.push({ level: "error", message: "AUTH_MODE harus development atau production." });
}
for (const name of [
  "AUTH_REQUIRE_EMAIL_VERIFICATION",
  "ADMIN_DEV_BYPASS",
  "INTERNAL_DEV_HEADERS_ENABLED",
]) {
  if (process.env[name] && !isBooleanEnv(process.env[name])) {
    problems.push({ level: "error", message: `${name} harus bernilai true atau false.` });
  }
}
if (authMode === "production") {
  if (authProvider !== "supabase") {
    problems.push({
      level: "error",
      message: "AUTH_MODE=production wajib memakai AUTH_PROVIDER=supabase.",
    });
  }
  if (process.env.ADMIN_DEV_BYPASS === "true") {
    problems.push({ level: "error", message: "ADMIN_DEV_BYPASS wajib false di production." });
  }
  if (process.env.INTERNAL_DEV_HEADERS_ENABLED === "true") {
    problems.push({
      level: "error",
      message: "INTERNAL_DEV_HEADERS_ENABLED wajib false di production.",
    });
  }
}
if (authProvider === "supabase") {
  for (const name of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]) {
    if (!process.env[name]?.trim()) {
      problems.push({
        level: authMode === "production" ? "error" : "warning",
        message: `${name} wajib untuk AUTH_PROVIDER=supabase.`,
      });
    }
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

if (process.env.WOOCOMMERCE_ENABLED === "true") {
  const mediaToken = process.env.WORDPRESS_MEDIA_TOKEN?.trim();
  const mediaUsername = process.env.WORDPRESS_MEDIA_USERNAME?.trim();
  const mediaPassword = process.env.WORDPRESS_MEDIA_APP_PASSWORD?.trim();
  if (!mediaToken && !(mediaUsername && mediaPassword)) {
    problems.push({
      level: appEnv === "development" ? "warning" : "error",
      message:
        "Upload foto produk membutuhkan WORDPRESS_MEDIA_TOKEN atau pasangan WORDPRESS_MEDIA_USERNAME + WORDPRESS_MEDIA_APP_PASSWORD.",
    });
  }
}

if (process.env.PAYMENT_PROVIDER === "ipaymu") {
  for (const name of [
    "IPAYMU_ENABLED",
    "PAYMENT_MODE",
    "IPAYMU_MODE",
    "IPAYMU_VA",
    "IPAYMU_API_KEY",
    "IPAYMU_BASE_URL",
    "IPAYMU_NOTIFY_URL",
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
  if (process.env.IPAYMU_ENABLED !== "true") {
    problems.push({
      level: appEnv === "development" ? "warning" : "error",
      message: "PAYMENT_PROVIDER=ipaymu membutuhkan IPAYMU_ENABLED=true.",
    });
  }
  const paymentMode = process.env.PAYMENT_MODE?.trim().toLowerCase();
  const ipaymuMode = process.env.IPAYMU_MODE?.trim().toLowerCase();
  if (!isPaymentMode(paymentMode)) {
    problems.push({
      level: appEnv === "development" ? "warning" : "error",
      message: "PAYMENT_MODE harus sandbox atau live.",
    });
  }
  if (!isPaymentMode(ipaymuMode)) {
    problems.push({
      level: appEnv === "development" ? "warning" : "error",
      message: "IPAYMU_MODE harus sandbox atau live.",
    });
  }
  if (
    isPaymentMode(paymentMode) &&
    isPaymentMode(ipaymuMode) &&
    paymentMode !== ipaymuMode
  ) {
    problems.push({
      level: appEnv === "development" ? "warning" : "error",
      message: "PAYMENT_MODE dan IPAYMU_MODE harus sama.",
    });
  }
  if (!isPublicHttpsUrl(process.env.IPAYMU_NOTIFY_URL)) {
    problems.push({
      level: appEnv === "development" ? "warning" : "error",
      message:
        "IPAYMU_NOTIFY_URL harus berupa HTTPS publik; localhost tidak dapat menerima callback iPaymu.",
    });
  }
  const expectedIpaymuHost =
    ipaymuMode === "live" ? "my.ipaymu.com" : "sandbox.ipaymu.com";
  if (urlHost(process.env.IPAYMU_BASE_URL) !== expectedIpaymuHost) {
    problems.push({
      level: appEnv === "development" ? "warning" : "error",
      message: `IPAYMU_BASE_URL harus memakai ${expectedIpaymuHost} untuk mode ${ipaymuMode || "sandbox"}.`,
    });
  }
  problems.push({
    level: "warning",
    message:
      "PAYMENT_PROVIDER=ipaymu wajib dites di sandbox; return URL bukan bukti paid, hanya callback valid yang mengubah status.",
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

if (process.env.EMAIL_PROVIDER === "smtp") {
  for (const name of [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_SECURE",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "EMAIL_FROM",
    "SALES_QUOTATION_EMAIL",
  ]) {
    if (!process.env[name]?.trim()) {
      problems.push({
        level: appEnv === "development" ? "warning" : "error",
        message: `${name} wajib untuk EMAIL_PROVIDER=smtp.`,
      });
    }
  }
  const smtpPort = Number(process.env.SMTP_PORT);
  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    problems.push({
      level: appEnv === "development" ? "warning" : "error",
      message: "SMTP_PORT harus berupa port valid antara 1-65535.",
    });
  }
  if (!isBooleanEnv(process.env.SMTP_SECURE)) {
    problems.push({
      level: appEnv === "development" ? "warning" : "error",
      message: "SMTP_SECURE harus bernilai true atau false.",
    });
  }
  if (process.env.SMTP_USER && !isValidEmail(process.env.SMTP_USER)) {
    problems.push({
      level: appEnv === "development" ? "warning" : "error",
      message: "SMTP_USER harus berupa alamat email valid.",
    });
  }
  if (process.env.EMAIL_ENABLED !== "true") {
    problems.push({
      level: "warning",
      message:
        "EMAIL_PROVIDER=smtp aktif, tetapi EMAIL_ENABLED belum true. Email production akan diskip.",
    });
  }
}

if (process.env.EMAIL_FROM && !isValidMailbox(process.env.EMAIL_FROM)) {
  problems.push({
    level: appEnv === "production" ? "error" : "warning",
    message: "EMAIL_FROM tidak valid.",
  });
}

if (process.env.EMAIL_REPLY_TO && !isValidEmail(process.env.EMAIL_REPLY_TO)) {
  problems.push({
    level: appEnv === "production" ? "error" : "warning",
    message: "EMAIL_REPLY_TO tidak valid.",
  });
}

if (process.env.SALES_QUOTATION_EMAIL && !isValidEmail(process.env.SALES_QUOTATION_EMAIL)) {
  problems.push({
    level: appEnv === "production" ? "error" : "warning",
    message: "SALES_QUOTATION_EMAIL tidak valid.",
  });
}

if (process.env.EMAIL_TEST_TO && !isValidEmail(process.env.EMAIL_TEST_TO)) {
  problems.push({
    level: appEnv === "production" ? "error" : "warning",
    message: "EMAIL_TEST_TO tidak valid.",
  });
}

if (process.env.ORDER_NOTIFICATION_EMAIL_ENABLED === "true") {
  const recipients = (process.env.ORDER_NOTIFICATION_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
  if (recipients.length === 0 || recipients.some((email) => !isValidEmail(email))) {
    problems.push({
      level: appEnv === "production" ? "error" : "warning",
      message:
        "ORDER_NOTIFICATION_EMAILS wajib berisi alamat valid saat notifikasi order aktif.",
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
      "STORAGE_PROVIDER=s3 masih boundary future storage; SDK/credential S3/R2 belum diaktifkan.",
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

function isValidMailbox(value: string) {
  const trimmed = value.trim();
  if (/[\r\n]/.test(trimmed)) return false;
  const match = trimmed.match(/<([^<>]+)>$/);
  return isValidEmail((match?.[1] ?? trimmed).trim());
}

function isValidEmail(value: string) {
  if (/[\r\n]/.test(value)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && value.trim().length <= 254;
}

function isBooleanEnv(value: string | undefined) {
  return value === "true" || value === "false";
}

function isPaymentMode(value: string | undefined): value is "sandbox" | "live" {
  return value === "sandbox" || value === "live";
}

function isPublicHttpsUrl(value: string | undefined) {
  try {
    const url = new URL(value ?? "");
    return (
      url.protocol === "https:" &&
      !["localhost", "127.0.0.1", "::1"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

function urlHost(value: string | undefined) {
  try {
    return new URL(value ?? "").hostname.toLowerCase();
  } catch {
    return "";
  }
}
