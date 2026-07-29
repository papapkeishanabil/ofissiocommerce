import "server-only";

import { randomUUID } from "node:crypto";

import type { EmailProviderAdapter } from "../email.types";

export const mockEmailProvider: EmailProviderAdapter = {
  name: "mock",
  async send() {
    return { providerMessageId: `mock_email_${randomUUID()}` };
  },
};
