import type {
  AdminNotification,
  AdminNotificationScope,
  AdminNotificationStatus,
  AdminNotificationType,
} from "./admin-notification.types";

export function isNotificationVisibleToScope(
  notification: AdminNotification,
  scope: AdminNotificationScope,
) {
  const roleMatches =
    notification.recipientRole === null || notification.recipientRole === scope.role;
  const userMatches =
    notification.recipientUserId === null ||
    notification.recipientUserId === scope.userId;
  return roleMatches && userMatches;
}

export function isPendingOrderNotification(notification: AdminNotification) {
  return (
    notification.type === "order_created" &&
    (notification.status === "unread" || notification.status === "read")
  );
}

export function isPopupOrderNotification(notification: AdminNotification) {
  return notification.type === "order_created" && notification.status === "unread";
}

export function isPendingQuotationNotification(notification: AdminNotification) {
  return (
    notification.type === "quotation_accepted" &&
    notification.status === "unread"
  );
}

export function isPopupNotification(notification: AdminNotification) {
  return (
    ["order_created", "quotation_accepted"].includes(notification.type) &&
    notification.status === "unread"
  );
}

export function transitionNotification(
  notification: AdminNotification,
  status: AdminNotificationStatus,
  now = new Date().toISOString(),
): AdminNotification {
  return {
    ...notification,
    status,
    readAt:
      status === "read" || status === "acknowledged" || status === "resolved"
        ? notification.readAt ?? now
        : notification.readAt,
    acknowledgedAt:
      status === "acknowledged" || status === "resolved"
        ? notification.acknowledgedAt ?? now
        : notification.acknowledgedAt,
    resolvedAt: status === "resolved" ? notification.resolvedAt ?? now : null,
    updatedAt: now,
  };
}

export function notificationTypeGroup(type: AdminNotificationType) {
  if (type === "order_created") return "order";
  if (type === "quotation_accepted") return "quotation";
  if (type === "payment_paid") return "payment";
  if (type === "shipment_created") return "shipment";
  return "system";
}

export function formatNotificationMoney(value: number, currency = "IDR") {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function safeNotificationMetadata(metadata: Record<string, unknown>) {
  const blocked = /(secret|token|password|authorization|api[_-]?key|raw)/i;
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !blocked.test(key))
      .map(([key, value]) => [
        key,
        typeof value === "string" ? value.slice(0, 500) : value,
      ]),
  );
}

export function orderNotificationEmailIdempotencyKey(orderId: string) {
  return `order_created_email:${orderId}`;
}

export function isOrderNotificationEmailEnabled(value?: string) {
  return ["1", "true", "yes", "on"].includes(value?.trim().toLowerCase() ?? "");
}
