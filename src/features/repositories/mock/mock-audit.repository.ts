import "server-only";

import type { AuditLogRepository } from "../repository.types";

export const mockAuditRepository: AuditLogRepository = {
  async writeAuditLog() {
    // Existing audit-log module remains source of truth in mock mode.
  },
};
