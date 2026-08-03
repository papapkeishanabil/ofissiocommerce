import { randomUUID } from "node:crypto";

import { loadEnvConfig } from "@next/env";
import nodemailer from "nodemailer";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

type EmailProvider = "mock" | "resend" | "smtp";

run().catch((error: unknown) => {
  console.error("ERROR: Ofissio email check gagal.");
  console.error(`Reason: ${safeReason(error)}`);
  process.exitCode = 1;
});

async function run() {
  printHeader();
  assertNoPublicEmailSecrets();

  const config = getConfig();
  console.log(`requestedProvider=${config.provider}`);
  console.log(`emailEnabled=${config.enabled}`);

  const issues = validateConfigForCheck(config);
  if (issues.length > 0) {
    for (const issue of issues) console.log(`ERROR: ${issue}`);
    process.exitCode = 1;
    return;
  }

  if (config.provider === "mock") {
    console.log("OK: EMAIL_PROVIDER=mock; real email send skipped.");
    console.log("INFO: Mock email flow tetap membuat email_logs saat aplikasi mengirim email.");
    return;
  }

  if (!config.enabled) {
    console.log(`SKIP: EMAIL_PROVIDER=${config.provider} tetapi EMAIL_ENABLED=false; real email tidak dikirim.`);
    return;
  }

  if (!config.testSend) {
    console.log(`OK: ${config.provider.toUpperCase()} config siap untuk staging.`);
    console.log("INFO: Real send skipped. Set EMAIL_TEST_SEND=true untuk kirim test email eksplisit.");
    return;
  }

  if (!config.testEmailTo) {
    console.log("ERROR: EMAIL_TEST_TO wajib saat EMAIL_TEST_SEND=true.");
    process.exitCode = 1;
    return;
  }

  const sent = config.provider === "resend"
    ? await sendResendTestEmail(config, config.testEmailTo)
    : await sendSmtpTestEmail(config, config.testEmailTo);
  const logId = await persistEmailLog({
    config,
    recipient: config.testEmailTo,
    status: "sent",
    providerMessageId: sent.providerMessageId,
    errorMessage: null,
  });
  console.log(`OK: Test email sent via ${config.provider.toUpperCase()}.`);
  console.log(sent.providerMessageId ? "OK: providerMessageId received." : "INFO: providerMessageId belum tersedia dari provider.");
  console.log(logId ? "OK: email_logs persisted." : "INFO: email_logs persistence skipped.");
}

function getConfig() {
  const rawProvider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  const provider: EmailProvider = rawProvider === "resend" || rawProvider === "smtp"
    ? rawProvider
    : "mock";
  const smtpPort = Number(process.env.SMTP_PORT?.trim() || "465");
  return {
    provider,
    enabled: envFlag("EMAIL_ENABLED", false),
    testSend: envFlag("EMAIL_TEST_SEND", false),
    apiKey: process.env.RESEND_API_KEY?.trim() || "",
    from: process.env.EMAIL_FROM?.trim() || "Ofissio <quotation@ofissio.com>",
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || "",
    salesEmail: process.env.SALES_QUOTATION_EMAIL?.trim() || "",
    orderNotificationEnabled: envFlag("ORDER_NOTIFICATION_EMAIL_ENABLED", false),
    orderNotificationEmails: parseEmailList(process.env.ORDER_NOTIFICATION_EMAILS),
    testEmailTo: process.env.EMAIL_TEST_TO?.trim() || "",
    smtpHost: process.env.SMTP_HOST?.trim() || "",
    smtpPort,
    smtpSecureRaw: process.env.SMTP_SECURE?.trim().toLowerCase() || "true",
    smtpSecure: envFlag("SMTP_SECURE", true),
    smtpUser: process.env.SMTP_USER?.trim() || "",
    smtpPassword: process.env.SMTP_PASSWORD?.trim() || "",
  };
}

function validateConfigForCheck(config: ReturnType<typeof getConfig>) {
  const issues: string[] = [];
  if (!isValidMailbox(config.from)) issues.push("EMAIL_FROM tidak valid.");
  if (config.replyTo && !isValidEmail(config.replyTo)) issues.push("EMAIL_REPLY_TO tidak valid.");
  if (config.testEmailTo && !isValidEmail(config.testEmailTo)) issues.push("EMAIL_TEST_TO tidak valid.");
  if (config.testSend && !config.testEmailTo) issues.push("EMAIL_TEST_TO wajib saat EMAIL_TEST_SEND=true.");
  if (config.orderNotificationEnabled && config.orderNotificationEmails.length === 0) {
    issues.push("ORDER_NOTIFICATION_EMAILS wajib berisi minimal satu alamat valid saat notifikasi order aktif.");
  }
  const rawOrderRecipients = (process.env.ORDER_NOTIFICATION_EMAILS ?? "").split(",").map((email) => email.trim()).filter(Boolean);
  if (rawOrderRecipients.some((email) => !isValidEmail(email))) {
    issues.push("ORDER_NOTIFICATION_EMAILS mengandung alamat yang tidak valid.");
  }
  if (config.provider === "resend") {
    if (!config.apiKey) issues.push("RESEND_API_KEY wajib saat EMAIL_PROVIDER=resend.");
    validateSharedLiveConfig(config, issues);
  }
  if (config.provider === "smtp") {
    if (!config.smtpHost) issues.push("SMTP_HOST wajib saat EMAIL_PROVIDER=smtp.");
    if (!Number.isInteger(config.smtpPort) || config.smtpPort < 1 || config.smtpPort > 65535) {
      issues.push("SMTP_PORT harus berupa port valid antara 1-65535.");
    }
    if (!["true", "false"].includes(config.smtpSecureRaw)) {
      issues.push("SMTP_SECURE harus bernilai true atau false.");
    }
    if (!config.smtpUser || !isValidEmail(config.smtpUser)) {
      issues.push("SMTP_USER wajib berupa alamat email valid saat EMAIL_PROVIDER=smtp.");
    }
    if (!config.smtpPassword) issues.push("SMTP_PASSWORD wajib saat EMAIL_PROVIDER=smtp.");
    validateSharedLiveConfig(config, issues);
  }
  return issues;
}

function validateSharedLiveConfig(config: ReturnType<typeof getConfig>, issues: string[]) {
  if (!config.salesEmail) issues.push("SALES_QUOTATION_EMAIL wajib untuk provider email live.");
  else if (!isValidEmail(config.salesEmail)) issues.push("SALES_QUOTATION_EMAIL tidak valid.");
}

async function sendResendTestEmail(config: ReturnType<typeof getConfig>, recipient: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: controller.signal,
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: config.from,
      to: [recipient],
      reply_to: config.replyTo || undefined,
      subject: "[Ofissio Staging] Test Email",
      html: "<p>Ini adalah test email staging Ofissio via Resend.</p>",
      text: "Ini adalah test email staging Ofissio via Resend.",
    }),
  }).finally(() => clearTimeout(timeout));
  if (!response.ok) {
    await persistFailedEmail(config, recipient, `resend_http_${response.status}`);
    throw new Error(`resend_http_${response.status}`);
  }
  const payload = (await response.json().catch(() => null)) as { id?: string } | null;
  return { providerMessageId: typeof payload?.id === "string" ? payload.id : null };
}

async function sendSmtpTestEmail(config: ReturnType<typeof getConfig>, recipient: string) {
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: { user: config.smtpUser, pass: config.smtpPassword },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    tls: { minVersion: "TLSv1.2" },
  });
  try {
    const result = await transporter.sendMail({
      from: config.from,
      to: recipient,
      replyTo: config.replyTo || undefined,
      subject: "[Ofissio Staging] Test Email",
      html: "<p>Ini adalah test email staging Ofissio via SMTP Hostinger.</p>",
      text: "Ini adalah test email staging Ofissio via SMTP Hostinger.",
    });
    return { providerMessageId: typeof result.messageId === "string" ? result.messageId : null };
  } catch (error) {
    await persistFailedEmail(config, recipient, smtpFailureCode(error));
    throw new Error(smtpFailureCode(error));
  } finally {
    transporter.close();
  }
}

async function persistFailedEmail(config: ReturnType<typeof getConfig>, recipient: string, errorMessage: string) {
  await persistEmailLog({ config, recipient, status: "failed", providerMessageId: null, errorMessage }).catch(() => null);
}

async function persistEmailLog(input: {
  config: ReturnType<typeof getConfig>;
  recipient: string;
  status: "sent" | "failed";
  providerMessageId: string | null;
  errorMessage: string | null;
}) {
  if (process.env.DATABASE_PROVIDER !== "supabase") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  const id = `email_${randomUUID()}`;
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/email_logs`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      id,
      company_id: null,
      user_id: "check-email",
      provider: input.config.provider,
      status: input.status,
      type: "test_email",
      recipient_emails_json: [input.recipient],
      from_email: input.config.from,
      reply_to_email: input.config.replyTo || null,
      subject: "[Ofissio Staging] Test Email",
      provider_message_id: input.providerMessageId,
      error_message: input.errorMessage,
      safe_metadata_json: { script: "check-email", provider: input.config.provider },
      created_at: new Date().toISOString(),
      sent_at: input.status === "sent" ? new Date().toISOString() : null,
    }),
  });
  if (!response.ok) throw new Error(`email_log_insert_${response.status}`);
  return id;
}

function parseEmailList(value?: string) {
  return (value ?? "").split(",").map((email) => email.trim().toLowerCase()).filter((email, index, values) => Boolean(email) && isValidEmail(email) && values.indexOf(email) === index);
}

function assertNoPublicEmailSecrets() {
  for (const name of ["NEXT_PUBLIC_RESEND_API_KEY", "NEXT_PUBLIC_SMTP_PASSWORD"]) {
    if (process.env[name]) throw new Error(`${name} tidak boleh diset.`);
  }
}

function envFlag(name: string, fallback: boolean) {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return ["1", "true", "yes", "on"].includes(raw);
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

function smtpFailureCode(error: unknown) {
  const code = error instanceof Error && "code" in error && typeof error.code === "string"
    ? error.code.toUpperCase()
    : "";
  if (["EAUTH", "EENVELOPE"].includes(code)) return "smtp_auth_failed";
  if (["ETIMEDOUT", "ESOCKET"].includes(code)) return "smtp_timeout";
  if (["ECONNECTION", "ECONNREFUSED", "ENOTFOUND"].includes(code)) return "smtp_connection_failed";
  return "smtp_send_failed";
}

function printHeader() {
  console.log("Ofissio email check");
  console.log("-------------------");
}

function safeReason(error: unknown) {
  if (!(error instanceof Error)) return "unknown_error";
  return error.message.replace(/(api[_-]?key|secret|token|password|authorization)=?[^\s,]*/gi, "$1=[redacted]");
}
