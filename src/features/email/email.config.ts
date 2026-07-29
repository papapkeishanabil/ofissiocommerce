import "server-only";

import type { EmailProvider, EmailRuntimeConfig } from "./email.types";

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
  return {
    ok:
      config.provider === "mock" ||
      (config.enabled && config.provider === "resend" && config.resendConfigured),
    config,
    warning:
      config.requestedProvider === "resend" && !config.resendConfigured
        ? "RESEND_API_KEY belum dikonfigurasi; email fallback ke mock."
        : null,
  };
}
