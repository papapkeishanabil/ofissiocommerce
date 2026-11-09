import type { CreateAdminNotificationInput, AdminNotification, AdminNotificationScope } from "@/features/admin-notifications/admin-notification.types";
import type { SupportConversation } from "./support.types";

export function isLiveChatNotification(notification: Pick<AdminNotification, "entityType" | "metadata">) {
  return notification.entityType === "ofistant_chat_event" && notification.metadata.source === "ofistant_live_chat";
}

export function canReceiveChatNotification(notification: AdminNotification, scope: AdminNotificationScope) {
  return ["super_admin", "sales_admin", "sales"].includes(scope.role) &&
    (!notification.recipientUserId || notification.recipientUserId === scope.userId);
}

export function chatNotificationInput(conversation: SupportConversation, eventId: string, handoff: boolean, messageBody?: string): CreateAdminNotificationInput {
  const name = conversation.customerName.replace(/\s+/gu, " ").trim().slice(0, 60) || "Customer";
  const preview = Array.from((messageBody ?? "").replace(/\s+/gu, " ").trim());
  const body = preview.length > 180 ? preview.slice(0, 179).join("") + "…" : preview.join("");
  return {
    type: "system_warning", entityType: "ofistant_chat_event", entityId: eventId,
    title: handoff ? `${name} menunggu bantuan` : `Pesan dari ${name}`,
    message: handoff ? "Ada customer yang ingin berbicara dengan tim Ofissio." : body || "Buka Chat Customer untuk membaca dan membalas pesan.",
    recipientUserId: conversation.status === "active" ? conversation.staffId : null,
    severity: "info", emailStatus: "not_required",
    metadata: { source: "ofistant_live_chat", conversationId: conversation.id, adminUrl: `/admin/chats?conversation=${conversation.id}` },
  };
}
