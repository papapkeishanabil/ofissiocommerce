import "server-only";

import { getOptionalServerEnv } from "@/lib/security/server-only-secret";

import type { EmailProviderAdapter } from "../email.types";

export const resendEmailProvider: EmailProviderAdapter = {
  name: "resend",

  async send(input) {
    const apiKey = getOptionalServerEnv("RESEND_API_KEY");
    if (!apiKey) {
      throw new Error("Resend belum dikonfigurasi.");
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
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
    });
    if (!response.ok) {
      throw new Error(`Resend rejected email with ${response.status}`);
    }
    const payload = (await response.json().catch(() => null)) as
      | { id?: string }
      | null;
    return { providerMessageId: payload?.id ?? null };
  },
};
