import "server-only";

import { getOptionalServerEnv } from "@/lib/security/server-only-secret";

import type { EmailProviderAdapter } from "../email.types";

class ResendEmailProviderError extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = "ResendEmailProviderError";
  }
}

export const resendEmailProvider: EmailProviderAdapter = {
  name: "resend",

  async send(input) {
    const apiKey = getOptionalServerEnv("RESEND_API_KEY");
    if (!apiKey) {
      throw new ResendEmailProviderError("resend_missing_api_key");
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: input.from,
        to: input.to,
        reply_to: input.replyTo ?? undefined,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    }).finally(() => clearTimeout(timeout));
    if (!response.ok) {
      throw new ResendEmailProviderError(`resend_http_${response.status}`);
    }
    const payload = (await response.json().catch(() => null)) as { id?: string } | null;
    return { providerMessageId: typeof payload?.id === "string" ? payload.id : null };
  },
};
