import "server-only";

import { adminNotificationRepository } from "./admin-notification.repository";
import { isNotificationVisibleToScope, transitionNotification } from "./admin-notification.utils";
import type { AdminNotification, AdminNotificationScope } from "./admin-notification.types";
import { repositoryRegistry } from "@/features/repositories/repository.factory";

export interface SupportTicketContact {
  companyName: string;
  customerName: string;
  picName: string;
  picEmail: string;
  picWhatsapp: string;
}

export async function getSupportTicket(id: string, scope: AdminNotificationScope) {
  const notification = await findSupportTicket(id);
  if (!notification || notification.entityType !== "support_ticket" || !isNotificationVisibleToScope(notification, scope)) return null;
  const companyId = String(notification.metadata.companyId ?? "");
  const company = companyId ? await repositoryRegistry.company.getCompanyById(companyId).catch(() => null) : null;
  const row = company && typeof company === "object" ? company as Record<string, unknown> : {};
  const contact: SupportTicketContact = {
    companyName: String(notification.metadata.companyName ?? row.company_name ?? row.name ?? "-"),
    customerName: String(notification.metadata.customerName ?? "-"),
    picName: String(row.pic_name ?? row.picName ?? notification.metadata.customerName ?? "-"),
    picEmail: String(row.pic_email ?? row.picEmail ?? ""),
    picWhatsapp: String(row.pic_whatsapp ?? row.picWhatsapp ?? row.phone ?? ""),
  };
  return { notification, contact };
}

export async function updateSupportTicket(input: {
  id: string;
  scope: AdminNotificationScope;
  actorName: string;
  action: "contact_started" | "save_followup" | "waiting_customer" | "resolve";
  note?: string | null;
  nextFollowupAt?: string | null;
}) {
  const current = await findSupportTicket(input.id);
  if (!current || current.entityType !== "support_ticket" || !isNotificationVisibleToScope(current, input.scope)) return null;
  const now = new Date().toISOString();
  const followupStatus = input.action === "contact_started" ? "contact_started" : input.action === "waiting_customer" ? "waiting_customer" : input.action === "resolve" ? "resolved" : String(current.metadata.followupStatus ?? "under_review");
  const metadata = {
    ...current.metadata,
    followupStatus,
    assignedTo: current.metadata.assignedTo ?? input.actorName,
    contactedAt: input.action === "contact_started" ? current.metadata.contactedAt ?? now : current.metadata.contactedAt ?? null,
    followupNote: input.note?.trim() || current.metadata.followupNote || null,
    nextFollowupAt: input.nextFollowupAt || current.metadata.nextFollowupAt || null,
    lastFollowupAt: now,
  };
  const status = input.action === "resolve" ? "resolved" : current.status === "unread" || current.status === "read" ? "acknowledged" : current.status;
  return adminNotificationRepository.update(current.id, {
    ...transitionNotification(current, status, now),
    metadata,
  });
}

async function findSupportTicket(id: string) {
  const direct = await adminNotificationRepository.getById(id);
  if (direct) return direct;
  return (await adminNotificationRepository.listAll()).find(
    (notification) => notification.entityType === "support_ticket" && notification.entityId === id,
  ) ?? null;
}
