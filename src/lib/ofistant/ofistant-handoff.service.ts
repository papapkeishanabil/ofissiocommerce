import "server-only";

import { randomUUID } from "node:crypto";

import { createAdminNotification } from "@/features/admin-notifications/admin-notification.service";
import { adminNotificationRepository } from "@/features/admin-notifications/admin-notification.repository";
import { sendSupportTicketEmail } from "@/features/admin-notifications/support-ticket.email";
import { repositoryRegistry } from "@/features/repositories/repository.factory";
import { logAuditEvent } from "@/lib/security/audit-log";

export async function createOfistantSupportHandoff(input: {
  companyId: string;
  companyName: string;
  userId: string;
  customerName: string;
  orderId: string | null;
  orderNumber: string | null;
  reason: string;
  destination: "admin" | "cs_full_custom";
  category: "ready_stock" | "catalog_customization" | "full_custom_production";
  request?: Request;
}) {
  const open = (await repositoryRegistry.adminNotifications.listAll()).find(
    (notification) =>
      notification.entityType === "support_ticket" &&
      notification.metadata.source === "ofistant_customer_handoff" &&
      notification.metadata.companyId === input.companyId &&
      notification.metadata.orderId === input.orderId &&
      notification.metadata.destination === input.destination &&
      notification.metadata.category === input.category &&
      notification.status !== "resolved",
  );
  if (open) {
    return { ticketNumber: open.entityNumber ?? open.entityId, created: false };
  }

  const token = randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const ticketNumber = `${input.destination === "admin" ? "ADM" : "CS"}-${date}-${token}`;
  const entityId = `support_${randomUUID()}`;
  const result = await createAdminNotification({
    type: "system_warning",
    title:
      input.destination === "admin"
        ? "Customer meminta bantuan pesanan katalog"
        : "Customer meminta konsultasi Full Custom/Production",
    message:
      input.destination === "admin"
        ? `${input.customerName} dari ${input.companyName}${
            input.orderNumber ? ` meminta pengecekan pesanan ${input.orderNumber}` : " meminta bantuan Ready Stock/Bordir"
          }.`
        : `${input.customerName} dari ${input.companyName} meminta konsultasi desain, bahan, atau spesifikasi Full Custom/Production.`,
    entityType: "support_ticket",
    entityId,
    entityNumber: ticketNumber,
    severity: "warning",
    recipientRole: input.destination === "admin" ? "sales_admin" : "sales",
    metadata: {
      source: "ofistant_customer_handoff",
      companyId: input.companyId,
      companyName: input.companyName,
      userId: input.userId,
      customerName: input.customerName,
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      reason: input.reason.slice(0, 500),
      destination: input.destination,
      category: input.category,
      processRoute: input.category === "full_custom_production" ? "production" : input.category === "catalog_customization" ? "customization" : "fulfillment",
      adminUrl:
        input.destination === "admin"
          ? input.orderId
            ? `/admin/orders/${input.orderId}`
            : "/admin/orders"
          : `/admin/support-tickets/${encodeURIComponent(entityId)}`,
    },
    emailStatus: input.destination === "cs_full_custom" ? "pending" : "not_required",
  });
  let finalNotification = result.notification;
  if (result.created && input.destination === "cs_full_custom") {
    try {
      const email = await sendSupportTicketEmail(result.notification, input.request);
      finalNotification = (await adminNotificationRepository.update(result.notification.id, {
        emailStatus: !email ? "failed" : email.status === "sent" ? "sent" : email.status === "mocked" ? "mocked" : "failed",
        emailId: email?.id ?? null,
        emailError: !email ? "Belum ada akun CS Full Custom aktif dengan email valid." : email.errorMessage,
        metadata: {
          ...result.notification.metadata,
          emailRecipientRole: "sales",
          emailDispatchedAt: new Date().toISOString(),
          emailRecipientAvailable: Boolean(email),
        },
      })) ?? result.notification;
    } catch {
      finalNotification = (await adminNotificationRepository.update(result.notification.id, {
        emailStatus: "failed",
        emailError: "Email tiket CS belum dapat diproses.",
      })) ?? result.notification;
    }
  }
  logAuditEvent({
    request: input.request,
    actorId: input.userId,
    actorType: "customer",
    companyId: input.companyId,
    action: "ofistant_support_handoff_created",
    entityType: "support_ticket",
    entityId: finalNotification.id,
    metadata: {
      ticketNumber,
      orderId: input.orderId,
      destination: input.destination,
      category: input.category,
      emailStatus: finalNotification.emailStatus,
      pushStatus: (finalNotification.metadata.pushDispatch as { status?: string } | undefined)?.status ?? "unknown",
    },
  });
  return { ticketNumber, created: result.created };
}
