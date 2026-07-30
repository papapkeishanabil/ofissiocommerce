import "server-only";

import type { EmailProvider, EmailRuntimeConfig } from "./email.types";
import {
  isValidEmailAddress,
  isValidMailboxAddress,
} from "./email.validation";

function normalizeProvider(value?: string): EmailProvider {
  return value === "resend" ? "resend" : "mock";
}

function envFlag(name: string, fallback: boolean) {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return ["1", "true", "yes", "on"].includes(raw);
}

export function getEmailRuntimeConfig(): EmailRuntimeConfig {
  const requestedProvider = normalizeProvider(process.env.EMAIL_PROVIDER);
  const resendConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
  const provider =
    requestedProvider === "resend" && !resendConfigured ? "mock" : requestedProvider;
  return {
    requestedProvider,
    provider,
    enabled: envFlag("EMAIL_ENABLED", false),
    from:
      process.env.EMAIL_FROM?.trim() ||
      "Ofissio <quotation@ofissio.com>",
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || null,
    salesQuotationEmail: process.env.SALES_QUOTATION_EMAIL?.trim() || null,
    resendConfigured,
  };
}

export function validateEmailConfig() {
  const config = getEmailRuntimeConfig();
  const issues: string[] = [];
  const warnings: string[] = [];

  if (!isValidMailboxAddress(config.from)) {
    issues.push("EMAIL_FROM tidak valid.");
  }
  if (config.replyTo && !isValidEmailAddress(config.replyTo)) {
    issues.push("EMAIL_REPLY_TO tidak valid.");
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
      (config.requestedProvider === "resend" && !config.resendConfigured
        ? "RESEND_API_KEY belum dikonfigurasi; email fallback ke mock."
        : null),
  };
}
