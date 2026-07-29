import "server-only";

import type { EmailLog } from "@/features/email/email.types";
import type { EmailLogRepository } from "../repository.types";

type EmailRepositoryGlobal = typeof globalThis & {
  __ofissioEmailLogs?: Map<string, EmailLog>;
};

const emailGlobal = globalThis as EmailRepositoryGlobal;
const emailLogs =
  emailGlobal.__ofissioEmailLogs ??
  (emailGlobal.__ofissioEmailLogs = new Map<string, EmailLog>());

export const mockEmailLogRepository: EmailLogRepository = {
  async save(log) {
    emailLogs.set(log.id, log);
    return log;
  },

  async update(id, patch) {
    const current = emailLogs.get(id);
    if (!current) return null;
    const next: EmailLog = { ...current, ...patch };
    emailLogs.set(id, next);
    return next;
  },

  async setStatus(input) {
    return this.update(input.id, {
      status: input.status,
      providerMessageId: input.providerMessageId ?? null,
      errorMessage: input.errorMessage ?? null,
      sentAt: input.sentAt ?? null,
    });
  },

  async listByCompany(companyId) {
    return [...emailLogs.values()]
      .filter((log) => log.companyId === companyId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  },

  async listAll() {
    return [...emailLogs.values()].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  },
};
