import { randomUUID } from "node:crypto";

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

type EmailProvider = "mock" | "resend";

run().catch((error: unknown) => {
  console.error("ERROR: Ofissio email check gagal.");
  console.error(`Reason: ${safeReason(error)}`);
  process.exitCode = 1;
});

async function run() {
  printHeader();
  assertNoPublicResendKey();

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
    console.log("SKIP: EMAIL_PROVIDER=resend tetapi EMAIL_ENABLED=false; real email tidak dikirim.");
    console.log("INFO: Set EMAIL_ENABLED=true hanya setelah domain sender siap untuk staging.");
    return;
  }

  if (process.env.EMAIL_TEST_SEND !== "true") {
    console.log("OK: Resend config siap untuk staging.");
    console.log("INFO: Real send skipped. Set EMAIL_TEST_SEND=true untuk kirim test email eksplisit.");
    return;
  }

  const testRecipient = resolveTestRecipient(config);
  if (!testRecipient) {
    console.log(
      "ERROR: Isi EMAIL_TEST_TO, ORDER_NOTIFICATION_EMAILS, atau SALES_QUOTATION_EMAIL untuk real send.",
    );
    process.exitCode = 1;
    return;
  }
  const sent = await sendResendTestEmail(config, testRecipient);
  const logId = await persistEmailLog({
    config,
    recipient: testRecipient,
    status: sent.providerMessageId ? "sent" : "sent",
    providerMessageId: sent.providerMessageId,
    errorMessage: null,
  });
  console.log("OK: Test email sent via Resend.");
  console.log(
    sent.providerMessageId
      ? "OK: providerMessageId received."
      : "INFO: providerMessageId belum tersedia dari provider.",
  );
  console.log(logId ? "OK: email_logs persisted." : "INFO: email_logs persistence skipped.");
}

function getConfig() {
  const provider: EmailProvider = process.env.EMAIL_PROVIDER?.trim() === "resend"
    ? "resend"
    : "mock";
  return {
    provider,
    enabled: envFlag("EMAIL_ENABLED", false),
    apiKey: process.env.RESEND_API_KEY?.trim() || "",
    from: process.env.EMAIL_FROM?.trim() || "Ofissio <quotation@ofissio.com>",
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || "",
    salesEmail: process.env.SALES_QUOTATION_EMAIL?.trim() || "",
    orderNotificationEnabled: envFlag("ORDER_NOTIFICATION_EMAIL_ENABLED", false),
    orderNotificationEmails: parseEmailList(process.env.ORDER_NOTIFICATION_EMAILS),
    testEmailTo: process.env.EMAIL_TEST_TO?.trim() || "",
  };
}

function validateConfigForCheck(config: ReturnType<typeof getConfig>) {
  const issues: string[] = [];
  if (!isValidMailbox(config.from)) issues.push("EMAIL_FROM tidak valid.");
  if (config.replyTo && !isValidEmail(config.replyTo)) {
    issues.push("EMAIL_REPLY_TO tidak valid.");
  }
  if (config.testEmailTo && !isValidEmail(config.testEmailTo)) {
    issues.push("EMAIL_TEST_TO tidak valid.");
  }
  if (
    config.orderNotificationEnabled &&
    config.orderNotificationEmails.length === 0
  ) {
    issues.push(
      "ORDER_NOTIFICATION_EMAILS wajib berisi minimal satu alamat valid saat notifikasi order aktif.",
    );
  }
  const rawOrderRecipients = (process.env.ORDER_NOTIFICATION_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
  if (rawOrderRecipients.some((email) => !isValidEmail(email))) {
    issues.push("ORDER_NOTIFICATION_EMAILS mengandung alamat yang tidak valid.");
  }
  if (config.provider !== "resend") return issues;
  if (!config.enabled) return issues;
  if (!config.apiKey) {
    issues.push("RESEND_API_KEY wajib saat EMAIL_PROVIDER=resend dan EMAIL_ENABLED=true.");
  }
  if (!config.salesEmail) {
    issues.push("SALES_QUOTATION_EMAIL wajib saat EMAIL_PROVIDER=resend dan EMAIL_ENABLED=true.");
  } else if (!isValidEmail(config.salesEmail)) {
    issues.push("SALES_QUOTATION_EMAIL tidak valid.");
  }
  return issues;
}

async function sendResendTestEmail(
  config: ReturnType<typeof getConfig>,
  recipient: string,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: controller.signal,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
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
    await persistEmailLog({
      config,
      recipient,
      status: "failed",
      providerMessageId: null,
      errorMessage: `resend_http_${response.status}`,
    }).catch(() => null);
    throw new Error(`resend_http_${response.status}`);
  }
  const payload = (await response.json().catch(() => null)) as { id?: string } | null;
  return { providerMessageId: typeof payload?.id === "string" ? payload.id : null };
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
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      id,
      company_id: null,
      user_id: "check-email",
      provider: "resend",
      status: input.status,
      type: "test_email",
      recipient_emails_json: [input.recipient],
      from_email: input.config.from,
      reply_to_email: input.config.replyTo || null,
      subject: "[Ofissio Staging] Test Email",
      provider_message_id: input.providerMessageId,
      error_message: input.errorMessage,
      safe_metadata_json: { script: "check-email", phase: "21_resend_email_live" },
      created_at: new Date().toISOString(),
      sent_at: input.status === "sent" ? new Date().toISOString() : null,
    }),
  });
  if (!response.ok) throw new Error(`email_log_insert_${response.status}`);
  return id;
}

function resolveTestRecipient(config: ReturnType<typeof getConfig>) {
  return (
    config.testEmailTo ||
    config.orderNotificationEmails[0] ||
    config.salesEmail ||
    ""
  );
}

function parseEmailList(value?: string) {
  return (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email, index, values) =>
      Boolean(email) && isValidEmail(email) && values.indexOf(email) === index,
    );
}

function assertNoPublicResendKey() {
  if (process.env.NEXT_PUBLIC_RESEND_API_KEY) {
    throw new Error("NEXT_PUBLIC_RESEND_API_KEY tidak boleh diset.");
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

function printHeader() {
  console.log("Ofissio email check");
  console.log("-------------------");
}

function safeReason(error: unknown) {
  if (!(error instanceof Error)) return "unknown_error";
  return error.message.replace(
    /(api[_-]?key|secret|token|password|authorization)=?[^\s,]*/gi,
    "$1=[redacted]",
  );
}
