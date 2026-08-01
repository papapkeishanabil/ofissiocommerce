import "server-only";

import type { AdminNotification } from "@/features/admin-notifications/admin-notification.types";
import type { AdminNotificationRepository } from "../repository.types";

type NotificationGlobal = typeof globalThis & {
  __ofissioAdminNotifications?: Map<string, AdminNotification>;
};

const notificationGlobal = globalThis as NotificationGlobal;
const notifications =
  notificationGlobal.__ofissioAdminNotifications ??
  (notificationGlobal.__ofissioAdminNotifications = new Map<string, AdminNotification>());

export const mockAdminNotificationRepository: AdminNotificationRepository = {
  async create(notification) {
    const existing = [...notifications.values()].find(
      (candidate) =>
        candidate.type === notification.type &&
        candidate.entityType === notification.entityType &&
        candidate.entityId === notification.entityId,
    );
    if (existing) return existing;
    notifications.set(notification.id, notification);
    return notification;
  },
  async getById(id) {
    return notifications.get(id) ?? null;
  },
  async getByEntity(input) {
    return (
      [...notifications.values()].find(
        (notification) =>
          notification.type === input.type &&
          notification.entityType === input.entityType &&
          notification.entityId === input.entityId,
      ) ?? null
    );
  },
  async listAll() {
    return [...notifications.values()].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  },
  async update(id, patch) {
    const current = notifications.get(id);
    if (!current) return null;
    const next = { ...current, ...patch };
    notifications.set(id, next);
    return next;
  },
  async claimEmail(id, claimId) {
    const current = notifications.get(id);
    if (!current || current.emailStatus !== "pending" || current.emailId) return false;
    notifications.set(id, {
      ...current,
      emailId: claimId,
      updatedAt: new Date().toISOString(),
    });
    return true;
  },
};
