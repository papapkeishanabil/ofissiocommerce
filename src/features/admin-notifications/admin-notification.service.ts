import "server-only";

import { adminNotificationRepository } from "./admin-notification.repository";
import { createAdminNotificationManager } from "./admin-notification.core";
import { sendOrderCreatedEmail } from "./admin-notification.email";
import {
  formatNotificationMoney,
  isOrderNotificationEmailEnabled,
  orderNotificationEmailIdempotencyKey,
} from "./admin-notification.utils";
import type {
  AdminNotificationListFilters,
  AdminNotificationMutationContext,
  AdminNotificationScope,
  CreateAdminNotificationInput,
  OrderCreatedNotificationInput,
  QuotationAcceptedNotificationInput,
} from "./admin-notification.types";
import { logAuditEvent } from "@/lib/security/audit-log";
import { logInternalError } from "@/lib/security/safe-error-response";

const manager = createAdminNotificationManager(adminNotificationRepository);

export async function createAdminNotification(input: CreateAdminNotificationInput) {
  return manager.create(input);
}

export async function createOrderCreatedNotification(
  order: OrderCreatedNotificationInput,
  context: AdminNotificationMutationContext = {},
) {
  const emailEnabled = isOrderNotificationEmailEnabled(
    process.env.ORDER_NOTIFICATION_EMAIL_ENABLED,
  );
  const result = await manager.create({
    type: "order_created",
    title: "Order Baru Masuk",
    message: `Order ${order.orderNumber} dari ${order.companyName} senilai ${formatNotificationMoney(order.total, order.currency)}`,
    entityType: "order",
    entityId: order.orderId,
    entityNumber: order.orderNumber,
    severity: "info",
    metadata: {
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      quotationId: order.quotationId,
      customerName: order.customerName,
      companyName: order.companyName,
      total: order.total,
      currency: order.currency ?? "IDR",
      productSummary: order.productSummary,
      adminUrl: `/admin/orders/${order.orderId}`,
      source: order.source ?? "quotation_convert",
    },
    emailStatus: emailEnabled ? "pending" : "not_required",
  });

  if (result.created) {
    logAuditEvent({
      request: context.request,
      actorId: context.actorId ?? null,
      actorType: "system",
      action: "admin_notification_created",
      entityType: "admin_notification",
      entityId: result.notification.id,
      metadata: { type: "order_created", orderId: order.orderId },
    });
  }

  const notification = result.notification;
  if (notification.emailStatus === "pending" && !notification.emailId) {
    const claimed = await adminNotificationRepository.claimEmail(
      notification.id,
      orderNotificationEmailIdempotencyKey(order.orderId),
    );
    if (!claimed) {
      return (await adminNotificationRepository.getById(notification.id)) ?? notification;
    }
    try {
      const email = await sendOrderCreatedEmail(notification, context.request);
      if (email.kind === "not_required") {
        await adminNotificationRepository.update(notification.id, {
          emailStatus: "not_required",
          emailId: null,
          emailError: null,
        });
      } else if (email.kind === "failed" && !email.result) {
        await adminNotificationRepository.update(notification.id, {
          emailStatus: "failed",
          emailError: email.error,
        });
      } else if (email.result) {
        await adminNotificationRepository.update(notification.id, {
          emailStatus:
            email.result.status === "sent"
              ? "sent"
              : email.result.status === "mocked"
                ? "mocked"
                : "failed",
          emailId: email.result.id,
          emailError: email.result.errorMessage,
        });
      }
    } catch (error) {
      logInternalError(error, {
        area: "admin_notification_email",
        notificationId: notification.id,
        orderId: order.orderId,
      });
      await adminNotificationRepository
        .update(notification.id, {
          emailStatus: "failed",
          emailError: "Email internal belum dapat diproses.",
        })
        .catch(() => null);
    }
  }

  return (await adminNotificationRepository.getById(notification.id)) ?? notification;
}

export async function createQuotationAcceptedNotification(
  quotation: QuotationAcceptedNotificationInput,
  context: AdminNotificationMutationContext = {},
) {
  const result = await manager.create({
    type: "quotation_accepted",
    title: "Quotation Diterima Customer",
    message: `${quotation.customerName} dari ${quotation.companyName} menerima ${quotation.quotationNumber} senilai ${formatNotificationMoney(quotation.total, quotation.currency)}`,
    entityType: "quotation",
    entityId: quotation.quotationId,
    entityNumber: quotation.quotationNumber,
    severity: "success",
    metadata: {
      quotationId: quotation.quotationId,
      quotationNumber: quotation.quotationNumber,
      customerName: quotation.customerName,
      companyName: quotation.companyName,
      total: quotation.total,
      currency: quotation.currency ?? "IDR",
      productSummary: quotation.productSummary,
      adminUrl: `/admin/quotations/${quotation.quotationId}`,
      source: "customer_accept",
    },
    emailStatus: "not_required",
  });

  if (result.created) {
    logAuditEvent({
      request: context.request,
      actorId: context.actorId ?? null,
      actorType: "system",
      action: "admin_notification_created",
      entityType: "admin_notification",
      entityId: result.notification.id,
      metadata: {
        type: "quotation_accepted",
        quotationId: quotation.quotationId,
      },
    });
  }

  return result.notification;
}

export async function getUnreadNotificationCount(scope: AdminNotificationScope) {
  return (await manager.summary(scope)).totalUnread;
}

export function getAdminNotificationSummary(scope: AdminNotificationScope) {
  return manager.summary(scope);
}

export function listAdminNotifications(
  scope: AdminNotificationScope,
  filters: AdminNotificationListFilters = {},
) {
  return manager.list(scope, filters);
}

export function markNotificationRead(
  id: string,
  context: AdminNotificationMutationContext = {},
) {
  return transitionWithAudit(id, "read", context);
}

export function acknowledgeNotification(
  id: string,
  context: AdminNotificationMutationContext = {},
) {
  return transitionWithAudit(id, "acknowledged", context);
}

export function resolveNotification(
  id: string,
  context: AdminNotificationMutationContext = {},
) {
  return transitionWithAudit(id, "resolved", context);
}

export async function resolveOrderCreatedNotifications(
  orderId: string,
  context: AdminNotificationMutationContext = {},
) {
  const updated = await manager.resolveOrder(orderId);
  if (updated) {
    logAuditEvent({
      request: context.request,
      actorId: context.actorId ?? null,
      actorType: "internal",
      action: "admin_notification_resolved_by_order_process",
      entityType: "admin_notification",
      entityId: updated.id,
      metadata: { orderId },
    });
  }
  return updated;
}

async function transitionWithAudit(
  id: string,
  status: "read" | "acknowledged" | "resolved",
  context: AdminNotificationMutationContext,
) {
  const updated = await manager.transition(id, status);
  if (updated) {
    logAuditEvent({
      request: context.request,
      actorId: context.actorId ?? null,
      actorType: "internal",
      action: `admin_notification_${status}`,
      entityType: "admin_notification",
      entityId: updated.id,
      metadata: { notificationType: updated.type, entityId: updated.entityId },
    });
  }
  return updated;
}
