import "server-only";

import nodemailer from "nodemailer";

import { getOptionalServerEnv } from "@/lib/security/server-only-secret";

import type { EmailProviderAdapter } from "../email.types";

class SmtpEmailProviderError extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = "SmtpEmailProviderError";
  }
}

function smtpFlag(value: string, fallback: boolean) {
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function smtpPort(value: string) {
  const port = Number(value || "465");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new SmtpEmailProviderError("smtp_invalid_port");
  }
  return port;
}

function safeSmtpReason(error: unknown) {
  if (!(error instanceof Error)) return "smtp_unknown_error";
  const code = "code" in error && typeof error.code === "string"
    ? error.code.toUpperCase()
    : "";
  if (["EAUTH", "EENVELOPE"].includes(code)) return "smtp_auth_failed";
  if (["ETIMEDOUT", "ESOCKET"].includes(code)) return "smtp_timeout";
  if (["ECONNECTION", "ECONNREFUSED", "ENOTFOUND"].includes(code)) {
    return "smtp_connection_failed";
  }
  return "smtp_send_failed";
}

export const smtpEmailProvider: EmailProviderAdapter = {
  name: "smtp",

  async send(input) {
    const host = getOptionalServerEnv("SMTP_HOST");
    const user = getOptionalServerEnv("SMTP_USER");
    const pass = getOptionalServerEnv("SMTP_PASSWORD");
    if (!host || !user || !pass) {
      throw new SmtpEmailProviderError("smtp_missing_config");
    }

    const transporter = nodemailer.createTransport({
      host,
      port: smtpPort(getOptionalServerEnv("SMTP_PORT", "465")),
      secure: smtpFlag(getOptionalServerEnv("SMTP_SECURE", "true"), true),
      auth: { user, pass },
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      tls: { minVersion: "TLSv1.2" },
    });

    try {
      const result = await transporter.sendMail({
        from: input.from,
        to: input.to,
        replyTo: input.replyTo ?? undefined,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
      return {
        providerMessageId:
          typeof result.messageId === "string" ? result.messageId : null,
      };
    } catch (error) {
      throw new SmtpEmailProviderError(safeSmtpReason(error));
    } finally {
      transporter.close();
    }
  },
};
