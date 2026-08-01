import type { InternalRole } from "@/lib/security/security.types";

export const ADMIN_NOTIFICATION_TYPES = [
  "order_created",
  "quotation_accepted",
  "payment_paid",
  "shipment_created",
  "system_warning",
] as const;

export const ADMIN_NOTIFICATION_SEVERITIES = [
  "info",
  "success",
  "warning",
  "error",
] as const;

export const ADMIN_NOTIFICATION_STATUSES = [
  "unread",
  "read",
  "acknowledged",
  "resolved",
] as const;

export const ADMIN_NOTIFICATION_EMAIL_STATUSES = [
  "not_required",
  "pending",
  "sent",
  "mocked",
  "failed",
] as const;

export type AdminNotificationType = (typeof ADMIN_NOTIFICATION_TYPES)[number];
export type AdminNotificationSeverity = (typeof ADMIN_NOTIFICATION_SEVERITIES)[number];
export type AdminNotificationStatus = (typeof ADMIN_NOTIFICATION_STATUSES)[number];
export type AdminNotificationEmailStatus =
  (typeof ADMIN_NOTIFICATION_EMAIL_STATUSES)[number];

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  entityNumber: string | null;
  severity: AdminNotificationSeverity;
  status: AdminNotificationStatus;
  recipientRole: InternalRole | null;
  recipientUserId: string | null;
  metadata: Record<string, unknown>;
  emailStatus: AdminNotificationEmailStatus;
  emailId: string | null;
  emailError: string | null;
  createdAt: string;
  readAt: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  updatedAt: string;
}

export interface AdminNotificationScope {
  role: InternalRole;
  userId: string;
}

export interface AdminNotificationListFilters {
  status?: AdminNotificationStatus;
  type?: AdminNotificationType;
  limit?: number;
  cursor?: string;
}

export interface AdminNotificationSummary {
  totalUnread: number;
  ordersUnread: number;
  orderPopupUnread: number;
  latestOrderNotifications: AdminNotification[];
}

export interface CreateAdminNotificationInput {
  type: AdminNotificationType;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  entityNumber?: string | null;
  severity?: AdminNotificationSeverity;
  recipientRole?: InternalRole | null;
  recipientUserId?: string | null;
  metadata?: Record<string, unknown>;
  emailStatus?: AdminNotificationEmailStatus;
}

export interface OrderCreatedNotificationInput {
  orderId: string;
  orderNumber: string;
  quotationId: string | null;
  customerName: string;
  companyName: string;
  total: number;
  currency?: string;
  productSummary: string;
  source?: string;
}

export interface AdminNotificationMutationContext {
  actorId?: string | null;
  request?: Request;
}
