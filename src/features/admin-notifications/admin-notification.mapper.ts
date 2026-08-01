import type { AdminNotification } from "./admin-notification.types";

type Row = Record<string, unknown>;

export function adminNotificationToRow(notification: AdminNotification): Row {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    entity_type: notification.entityType,
    entity_id: notification.entityId,
    entity_number: notification.entityNumber,
    severity: notification.severity,
    status: notification.status,
    recipient_role: notification.recipientRole,
    recipient_user_id: notification.recipientUserId,
    metadata: notification.metadata,
    email_status: notification.emailStatus,
    email_id: notification.emailId,
    email_error: notification.emailError,
    created_at: notification.createdAt,
    read_at: notification.readAt,
    acknowledged_at: notification.acknowledgedAt,
    resolved_at: notification.resolvedAt,
    updated_at: notification.updatedAt,
  };
}

export function adminNotificationPatchToRow(
  patch: Partial<AdminNotification>,
): Row {
  const row: Row = {};
  if (patch.type) row.type = patch.type;
  if (patch.title) row.title = patch.title;
  if (patch.message) row.message = patch.message;
  if (patch.entityType) row.entity_type = patch.entityType;
  if (patch.entityId) row.entity_id = patch.entityId;
  if ("entityNumber" in patch) row.entity_number = patch.entityNumber ?? null;
  if (patch.severity) row.severity = patch.severity;
  if (patch.status) row.status = patch.status;
  if ("recipientRole" in patch) row.recipient_role = patch.recipientRole ?? null;
  if ("recipientUserId" in patch) row.recipient_user_id = patch.recipientUserId ?? null;
  if (patch.metadata) row.metadata = patch.metadata;
  if (patch.emailStatus) row.email_status = patch.emailStatus;
  if ("emailId" in patch) row.email_id = patch.emailId ?? null;
  if ("emailError" in patch) row.email_error = patch.emailError ?? null;
  if ("readAt" in patch) row.read_at = patch.readAt ?? null;
  if ("acknowledgedAt" in patch) row.acknowledged_at = patch.acknowledgedAt ?? null;
  if ("resolvedAt" in patch) row.resolved_at = patch.resolvedAt ?? null;
  row.updated_at = patch.updatedAt ?? new Date().toISOString();
  return row;
}

export function rowToAdminNotification(row: Row): AdminNotification {
  return {
    id: String(row.id),
    type: String(row.type) as AdminNotification["type"],
    title: String(row.title ?? "Notifikasi"),
    message: String(row.message ?? ""),
    entityType: String(row.entity_type ?? "system"),
    entityId: String(row.entity_id ?? ""),
    entityNumber: stringOrNull(row.entity_number),
    severity: String(row.severity ?? "info") as AdminNotification["severity"],
    status: String(row.status ?? "unread") as AdminNotification["status"],
    recipientRole: stringOrNull(row.recipient_role) as AdminNotification["recipientRole"],
    recipientUserId: stringOrNull(row.recipient_user_id),
    metadata: objectOrEmpty(row.metadata),
    emailStatus: String(row.email_status ?? "not_required") as AdminNotification["emailStatus"],
    emailId: stringOrNull(row.email_id),
    emailError: stringOrNull(row.email_error),
    createdAt: stringOrNull(row.created_at) ?? new Date().toISOString(),
    readAt: stringOrNull(row.read_at),
    acknowledgedAt: stringOrNull(row.acknowledged_at),
    resolvedAt: stringOrNull(row.resolved_at),
    updatedAt: stringOrNull(row.updated_at) ?? new Date().toISOString(),
  };
}

function stringOrNull(value: unknown) {
  if (typeof value === "string" && value.trim()) return value;
  if (value == null) return null;
  return String(value);
}

function objectOrEmpty(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
