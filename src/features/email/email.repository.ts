import "server-only";

import type { EmailLog, EmailStatus } from "./email.types";

type EmailRepositoryGlobal = typeof globalThis & {
  __ofissioEmailLogs?: Map<string, EmailLog>;
};

const emailGlobal = globalThis as EmailRepositoryGlobal;
const emailLogs =
  emailGlobal.__ofissioEmailLogs ??
  (emailGlobal.__ofissioEmailLogs = new Map<string, EmailLog>());

export const emailRepository = {
  save(log: EmailLog) {
    emailLogs.set(log.id, log);
    return log;
  },

  update(id: string, patch: Partial<EmailLog>) {
    const current = emailLogs.get(id);
    if (!current) return null;
    const next: EmailLog = { ...current, ...patch };
    emailLogs.set(id, next);
    return next;
  },

  setStatus(input: {
    id: string;
    status: EmailStatus;
    providerMessageId?: string | null;
    errorMessage?: string | null;
    sentAt?: string | null;
  }) {
    return this.update(input.id, {
      status: input.status,
      providerMessageId: input.providerMessageId ?? null,
      errorMessage: input.errorMessage ?? null,
      sentAt: input.sentAt ?? null,
    });
  },

  listByCompany(companyId: string) {
    return [...emailLogs.values()]
      .filter((log) => log.companyId === companyId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  },

  listAll() {
    return [...emailLogs.values()].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  },
};
