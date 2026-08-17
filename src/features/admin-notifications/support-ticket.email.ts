import "server-only";

import { listManagedInternalUsers } from "@/features/admin-users/admin-user.service";
import { sendEmail } from "@/features/email/email.service";
import type { EmailSendResult } from "@/features/email/email.types";

import type { AdminNotification } from "./admin-notification.types";

export async function sendSupportTicketEmail(
  notification: AdminNotification,
  request?: Request,
): Promise<EmailSendResult | null> {
  const recipients = (await listManagedInternalUsers())
    .filter((user) => user.role === "sales" && user.status === "active")
    .map((user) => user.email.trim().toLowerCase())
    .filter((email, index, values) => email && values.indexOf(email) === index);
  if (!recipients.length) return null;

  const ticketNumber = notification.entityNumber ?? notification.entityId;
  const companyName = String(notification.metadata.companyName ?? "-");
  const customerName = String(notification.metadata.customerName ?? "-");
  const reason = String(notification.metadata.reason ?? notification.message).slice(0, 500);
  const relativeUrl = String(notification.metadata.adminUrl ?? "/admin/notifications");
  const configuredBase = process.env.ADMIN_BASE_URL?.trim() || process.env.APP_URL?.trim() || "http://localhost:8000";
  const adminUrl = new URL(relativeUrl, configuredBase).toString();
  const subject = `Permintaan Full Custom Baru - ${ticketNumber}`;
  const text = [
    "Permintaan konsultasi Full Custom/Production baru",
    `Tiket: ${ticketNumber}`,
    `Customer: ${customerName}`,
    `Perusahaan: ${companyName}`,
    `Kebutuhan: ${reason}`,
    "Tindakan: buka tiket, pilih Saya Proses, lalu hubungi customer.",
    `Buka tiket: ${adminUrl}`,
  ].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6">
    <h1 style="font-size:20px">Permintaan Full Custom/Production Baru</h1>
    <p><strong>Tiket:</strong> ${escapeHtml(ticketNumber)}</p>
    <p><strong>Customer:</strong> ${escapeHtml(customerName)}</p>
    <p><strong>Perusahaan:</strong> ${escapeHtml(companyName)}</p>
    <p><strong>Kebutuhan:</strong> ${escapeHtml(reason)}</p>
    <p><strong>Tindakan:</strong> buka tiket, pilih Saya Proses, lalu hubungi customer.</p>
    <p><a href="${escapeHtml(adminUrl)}">Buka tiket di Ofissio Admin</a></p>
  </div>`;
  return sendEmail({
    type: "support_ticket_internal",
    companyId: String(notification.metadata.companyId ?? "") || null,
    userId: String(notification.metadata.userId ?? "") || null,
    to: recipients,
    subject,
    html,
    text,
    safeMetadata: {
      notificationId: notification.id,
      ticketNumber,
      recipientRole: "sales",
      recipientCount: recipients.length,
    },
    request,
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
