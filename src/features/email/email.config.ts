import "server-only";

import type { EmailProvider, EmailRuntimeConfig } from "./email.types";
import {
  isValidEmailAddress,
  isValidMailboxAddress,
} from "./email.validation";

function normalizeProvider(value?: string): EmailProvider {
  const normalized = value?.trim().toLowerCase();
  return normalized === "resend" || normalized === "smtp"
    ? normalized
    : "mock";
}

function envFlag(name: string, fallback: boolean) {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return ["1", "true", "yes", "on"].includes(raw);
}

function emailList(value?: string) {
  return (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email, index, values) =>
      Boolean(email) &&
      isValidEmailAddress(email) &&
      values.indexOf(email) === index,
    );
}

export function getEmailRuntimeConfig(): EmailRuntimeConfig {
  const requestedProvider = normalizeProvider(process.env.EMAIL_PROVIDER);
  const resendConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
  const smtpHost = process.env.SMTP_HOST?.trim() || null;
  const rawSmtpPort = process.env.SMTP_PORT?.trim();
  const parsedSmtpPort = Number(rawSmtpPort || "465");
  const smtpPort = Number.isInteger(parsedSmtpPort) && parsedSmtpPort > 0 && parsedSmtpPort <= 65535
    ? parsedSmtpPort
    : 465;
  const smtpUser = process.env.SMTP_USER?.trim() || null;
  const smtpPasswordConfigured = Boolean(process.env.SMTP_PASSWORD?.trim());
  const smtpPortValid = Number.isInteger(parsedSmtpPort) && parsedSmtpPort > 0 && parsedSmtpPort <= 65535;
  const smtpConfigured = Boolean(
    smtpHost &&
    smtpUser &&
    smtpPasswordConfigured &&
    smtpPortValid,
  );
  const provider = requestedProvider === "resend" && !resendConfigured
    ? "mock"
    : requestedProvider === "smtp" && !smtpConfigured
      ? "mock"
      : requestedProvider;
  return {
    requestedProvider,
    provider,
    enabled: envFlag("EMAIL_ENABLED", false),
    from:
      process.env.EMAIL_FROM?.trim() ||
      "Ofissio <quotation@ofissio.com>",
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || null,
    salesQuotationEmail: process.env.SALES_QUOTATION_EMAIL?.trim() || null,
    orderNotificationEmailEnabled: envFlag(
      "ORDER_NOTIFICATION_EMAIL_ENABLED",
      false,
    ),
    orderNotificationEmails: emailList(process.env.ORDER_NOTIFICATION_EMAILS),
    testEmailTo: process.env.EMAIL_TEST_TO?.trim() || null,
    resendConfigured,
    smtp: {
      host: smtpHost,
      port: smtpPort,
      secure: envFlag("SMTP_SECURE", true),
      user: smtpUser,
      passwordConfigured: smtpPasswordConfigured,
      configured: smtpConfigured,
    },
  };
}

export function validateEmailConfig() {
  const config = getEmailRuntimeConfig();
  const issues: string[] = [];
  const warnings: string[] = [];
  const rawOrderRecipients = (process.env.ORDER_NOTIFICATION_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  if (!isValidMailboxAddress(config.from)) {
    issues.push("EMAIL_FROM tidak valid.");
  }
  if (config.replyTo && !isValidEmailAddress(config.replyTo)) {
    issues.push("EMAIL_REPLY_TO tidak valid.");
  }
  if (config.testEmailTo && !isValidEmailAddress(config.testEmailTo)) {
    issues.push("EMAIL_TEST_TO tidak valid.");
  }
  if (
    config.orderNotificationEmailEnabled &&
    config.orderNotificationEmails.length === 0
  ) {
    issues.push(
      "ORDER_NOTIFICATION_EMAILS wajib berisi minimal satu alamat valid saat notifikasi order aktif.",
    );
  }
  if (rawOrderRecipients.some((email) => !isValidEmailAddress(email))) {
    issues.push("ORDER_NOTIFICATION_EMAILS mengandung alamat yang tidak valid.");
  }
  if (config.requestedProvider === "resend") {
    if (!config.resendConfigured) issues.push("RESEND_API_KEY belum dikonfigurasi.");
    if (!config.salesQuotationEmail) {
      issues.push("SALES_QUOTATION_EMAIL belum dikonfigurasi.");
    } else if (!isValidEmailAddress(config.salesQuotationEmail)) {
      issues.push("SALES_QUOTATION_EMAIL tidak valid.");
    }
    if (!config.enabled) {
      warnings.push(
        "EMAIL_PROVIDER=resend aktif, tetapi EMAIL_ENABLED=false sehingga email real diskip.",
      );
    }
  }
  if (config.requestedProvider === "smtp") {
    const rawPort = process.env.SMTP_PORT?.trim() || "465";
    const rawSecure = process.env.SMTP_SECURE?.trim().toLowerCase() || "true";
    const port = Number(rawPort);
    if (!config.smtp.host) issues.push("SMTP_HOST belum dikonfigurasi.");
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      issues.push("SMTP_PORT harus berupa port valid antara 1-65535.");
    }
    if (!["true", "false"].includes(rawSecure)) {
      issues.push("SMTP_SECURE harus bernilai true atau false.");
    }
    if (!config.smtp.user) {
      issues.push("SMTP_USER belum dikonfigurasi.");
    } else if (!isValidEmailAddress(config.smtp.user)) {
      issues.push("SMTP_USER harus berupa alamat email valid.");
    }
    if (!config.smtp.passwordConfigured) {
      issues.push("SMTP_PASSWORD belum dikonfigurasi.");
    }
    if (!config.salesQuotationEmail) {
      issues.push("SALES_QUOTATION_EMAIL belum dikonfigurasi.");
    } else if (!isValidEmailAddress(config.salesQuotationEmail)) {
      issues.push("SALES_QUOTATION_EMAIL tidak valid.");
    }
    if (!config.enabled) {
      warnings.push(
        "EMAIL_PROVIDER=smtp aktif, tetapi EMAIL_ENABLED=false sehingga email real diskip.",
      );
    }
    if (config.smtp.port === 465 && !config.smtp.secure) {
      warnings.push("SMTP_PORT=465 umumnya membutuhkan SMTP_SECURE=true.");
    }
    if (config.smtp.port === 587 && config.smtp.secure) {
      warnings.push("SMTP_PORT=587 umumnya memakai SMTP_SECURE=false dengan STARTTLS.");
    }
  }
  if (config.requestedProvider === "mock" && config.enabled) {
    warnings.push(
      "EMAIL_ENABLED=true dengan EMAIL_PROVIDER=mock hanya membuat mocked log.",
    );
  }

  return {
    ok: issues.length === 0,
    config,
    issues,
    warnings,
    warning:
      issues[0] ??
      warnings[0] ??
      (config.requestedProvider !== config.provider
        ? `Konfigurasi ${config.requestedProvider} belum lengkap; email fallback ke mock.`
        : null),
  };
}
