import "server-only";

import type { EmailLogRepository } from "../repository.types";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import { emailLogToRow, rowToEmailLog } from "./supabase-mappers";

export const supabaseEmailLogRepository: EmailLogRepository = {
  async save(log) {
    const rows = await getRequiredClient().insert("email_logs", emailLogToRow(log));
    return rowToEmailLog(rows[0] ?? emailLogToRow(log));
  },

  async update(id, patch) {
    const rows = await getRequiredClient().update(
      "email_logs",
      emailLogPatchToRow(patch),
      { id },
    );
    return rows[0] ? rowToEmailLog(rows[0]) : null;
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
    const rows = await getRequiredClient().select("email_logs", {
      filters: { company_id: companyId },
      order: "created_at.desc",
    });
    return rows.map(rowToEmailLog);
  },

  async listAll() {
    const rows = await getRequiredClient().select("email_logs", {
      order: "created_at.desc",
    });
    return rows.map(rowToEmailLog);
  },
};

function emailLogPatchToRow(patch: Parameters<EmailLogRepository["update"]>[1]) {
  const row: Record<string, unknown> = {};
  if (patch.to) row.recipient_emails_json = patch.to;
  if (patch.from) row.from_email = patch.from;
  if (patch.replyTo !== undefined) row.reply_to_email = patch.replyTo;
  if (patch.subject) row.subject = patch.subject;
  if (patch.type) row.type = patch.type;
  if (patch.provider) row.provider = patch.provider;
  if (patch.status) row.status = patch.status;
  if (patch.providerMessageId !== undefined) row.provider_message_id = patch.providerMessageId;
  if (patch.safeMetadata) row.safe_metadata_json = patch.safeMetadata;
  if (patch.errorMessage !== undefined) row.error_message = patch.errorMessage;
  if (patch.sentAt !== undefined) row.sent_at = patch.sentAt;
  return row;
}

function getRequiredClient() {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabase database belum dikonfigurasi.");
  return client;
}
