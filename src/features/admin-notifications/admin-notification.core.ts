import { randomUUID } from "node:crypto";

import type { AdminNotificationRepository } from "@/features/repositories/repository.types";

import type {
  AdminNotification,
  AdminNotificationListFilters,
  AdminNotificationScope,
  CreateAdminNotificationInput,
} from "./admin-notification.types";
import {
  isNotificationVisibleToScope,
  isPendingOrderNotification,
  isPendingQuotationNotification,
  isPopupNotification,
  isPopupOrderNotification,
  safeNotificationMetadata,
  transitionNotification,
} from "./admin-notification.utils";

export function createAdminNotificationManager(
  repository: AdminNotificationRepository,
) {
  return {
    async create(input: CreateAdminNotificationInput) {
      const existing = await repository.getByEntity({
        type: input.type,
        entityType: input.entityType,
        entityId: input.entityId,
      });
      if (existing) return { notification: existing, created: false };

      const now = new Date().toISOString();
      const notification: AdminNotification = {
        id: `ant_${randomUUID()}`,
        type: input.type,
        title: input.title.trim().slice(0, 180),
        message: input.message.trim().slice(0, 1_000),
        entityType: input.entityType.trim().slice(0, 80),
        entityId: input.entityId.trim().slice(0, 160),
        entityNumber: input.entityNumber?.trim().slice(0, 160) || null,
        severity: input.severity ?? "info",
        status: "unread",
        recipientRole: input.recipientRole ?? null,
        recipientUserId: input.recipientUserId ?? null,
        metadata: safeNotificationMetadata(input.metadata ?? {}),
        emailStatus: input.emailStatus ?? "not_required",
        emailId: null,
        emailError: null,
        createdAt: now,
        readAt: null,
        acknowledgedAt: null,
        resolvedAt: null,
        updatedAt: now,
      };
      const saved = await repository.create(notification);
      return {
        notification: saved,
        created: saved.id === notification.id,
      };
    },

    async list(scope: AdminNotificationScope, filters: AdminNotificationListFilters = {}) {
      const rows = (await repository.listAll())
        .filter((notification) => isNotificationVisibleToScope(notification, scope))
        .filter((notification) =>
          filters.status ? notification.status === filters.status : true,
        )
        .filter((notification) =>
          filters.type ? notification.type === filters.type : true,
        )
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      const cursorIndex = filters.cursor
        ? rows.findIndex((notification) => notification.id === filters.cursor)
        : -1;
      const start = cursorIndex >= 0 ? cursorIndex + 1 : 0;
      const limit = filters.limit ?? 50;
      const notifications = rows.slice(start, start + limit);
      return {
        notifications,
        nextCursor:
          start + notifications.length < rows.length
            ? notifications.at(-1)?.id ?? null
            : null,
      };
    },

    async summary(scope: AdminNotificationScope) {
      const rows = (await repository.listAll()).filter((notification) =>
        isNotificationVisibleToScope(notification, scope),
      );
      const pendingOrders = rows.filter(isPendingOrderNotification);
      const pendingQuotations = rows.filter(isPendingQuotationNotification);
      const popupOrders = rows
        .filter(isPopupOrderNotification)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      const popupNotifications = rows
        .filter(isPopupNotification)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      return {
        totalUnread: rows.filter((notification) => notification.status === "unread").length,
        ordersUnread: pendingOrders.length,
        quotationsUnread: pendingQuotations.length,
        popupUnread: popupNotifications.length,
        latestNotifications: popupNotifications.slice(0, 3),
        orderPopupUnread: popupOrders.length,
        latestOrderNotifications: popupOrders.slice(0, 3),
      };
    },

    async transition(id: string, status: AdminNotification["status"]) {
      const current = await repository.getById(id);
      if (!current) return null;
      if (current.status === "resolved") return current;
      if (current.status === "acknowledged" && status === "read") return current;
      return repository.update(id, transitionNotification(current, status));
    },

    async resolveOrder(orderId: string) {
      const notifications = await Promise.all(
        (["order_created", "payment_paid"] as const).map((type) =>
          repository.getByEntity({ type, entityType: "order", entityId: orderId }),
        ),
      );
      const updated = await Promise.all(
        notifications.filter(Boolean).map((notification) =>
          notification!.status === "resolved"
            ? Promise.resolve(notification)
            : repository.update(
                notification!.id,
                transitionNotification(notification!, "resolved"),
              ),
        ),
      );
      return updated.find((notification) => notification?.type === "payment_paid")
        ?? updated[0]
        ?? null;
    },

    async resolveQuotation(quotationId: string) {
      const notifications = await Promise.all(
        (["quotation_requested", "quotation_accepted"] as const).map((type) =>
          repository.getByEntity({ type, entityType: "quotation", entityId: quotationId }),
        ),
      );
      const updated = await Promise.all(
        notifications.filter(Boolean).map((notification) =>
          notification!.status === "resolved"
            ? Promise.resolve(notification)
            : repository.update(
                notification!.id,
                transitionNotification(notification!, "resolved"),
              ),
        ),
      );
      return updated.find((notification) => notification?.type === "quotation_accepted")
        ?? updated[0]
        ?? null;
    },
  };
}
