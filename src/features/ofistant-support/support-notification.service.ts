import "server-only";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import { createAdminNotification } from "@/features/admin-notifications/admin-notification.service";
import { chatNotificationInput } from "./support-notification";
import type { SupportResult } from "./support.types";

// Use a persisted event ID, not a request ID: network retries must not send a second push.
export async function notifyCustomerChat(action: string, messageId: string | undefined, result: SupportResult) {
  const conversation = result.conversation;
  const client = getSupabaseAdminClient();
  if (!client || !conversation || conversation.status === "closed") return;
  let eventId: string | undefined;
  if (action === "send" && messageId) {
    const rows = await client.select("ofistant_support_messages", {
      select: "id", filters: { conversation_id: conversation.id, id: messageId, role: "user", is_context: false }, limit: 1,
    });
    eventId = rows[0] ? String(rows[0].id) : undefined;
  } else if (action === "start" && conversation.status === "waiting") {
    const events = await Promise.all([
      "Permintaan diterima. Menunggu tim Ofissio. Anda dapat menambahkan pesan di sini.",
      "Percakapan dibuka kembali. Menunggu tim Ofissio.",
    ].map((body) => client.select("ofistant_support_messages", {
      select: "id,sequence", filters: { conversation_id: conversation.id, role: "system", body }, order: "sequence.desc", limit: 1,
    })));
    const latest = events.flat().sort((a, b) => Number(b.sequence) - Number(a.sequence))[0];
    eventId = latest ? String(latest.id) : undefined;
  }
  if (eventId) await createAdminNotification(chatNotificationInput(conversation, eventId, action === "start"));
}
