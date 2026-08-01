import "server-only";

import { sendEmail } from "@/features/email/email.service";
import { isValidEmailAddress } from "@/features/email/email.validation";

import type { AdminNotification } from "./admin-notification.types";
import {
  formatNotificationMoney,
  isOrderNotificationEmailEnabled,
  orderNotificationEmailIdempotencyKey,
} from "./admin-notification.utils";

export function getOrderNotificationEmailConfig() {
  const recipients = (process.env.ORDER_NOTIFICATION_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email, index, values) =>
      Boolean(email) && isValidEmailAddress(email) && values.indexOf(email) === index,
    );
  return {
    enabled: isOrderNotificationEmailEnabled(
      process.env.ORDER_NOTIFICATION_EMAIL_ENABLED,
    ),
    recipients,
  };
}

export async function sendOrderCreatedEmail(
  notification: AdminNotification,
  request?: Request,
) {
  const config = getOrderNotificationEmailConfig();
  if (!config.enabled) {
    return { kind: "not_required" as const, result: null };
  }
  if (config.recipients.length === 0) {
    return {
      kind: "failed" as const,
      result: null,
      error: "ORDER_NOTIFICATION_EMAILS belum diisi dengan alamat email valid.",
    };
  }

  const orderNumber = String(
    notification.metadata.orderNumber ?? notification.entityNumber ?? notification.entityId,
  );
  const customerName = String(notification.metadata.customerName ?? "Customer Ofissio");
  const companyName = String(notification.metadata.companyName ?? "-");
  const productSummary = String(notification.metadata.productSummary ?? "-");
  const total = Number(notification.metadata.total ?? 0);
  const currency = String(notification.metadata.currency ?? "IDR");
  const relativeUrl = String(
    notification.metadata.adminUrl ?? `/admin/orders/${notification.entityId}`,
  );
  const baseUrl =
    process.env.ADMIN_BASE_URL?.trim() || process.env.APP_BASE_URL?.trim() || process.env.APP_URL?.trim();
  const adminUrl = baseUrl ? new URL(relativeUrl, baseUrl).toString() : relativeUrl;
  const subject = `Order Baru Masuk - ${orderNumber}`;
  const safeTotal = formatNotificationMoney(total, currency);
  const text = [
    "Order Baru Masuk",
    `Order: ${orderNumber}`,
    `Customer: ${customerName}`,
    `Perusahaan: ${companyName}`,
    `Total: ${safeTotal}`,
    `Produk: ${productSummary}`,
    `Waktu: ${notification.createdAt}`,
    `Lihat order: ${adminUrl}`,
  ].join("\n");
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;color:#0f172a;line-height:1.55">
      <h1 style="font-size:22px;margin:0 0 16px">Order Baru Masuk</h1>
      <p><strong>Order:</strong> ${escapeHtml(orderNumber)}</p>
      <p><strong>Customer:</strong> ${escapeHtml(customerName)}</p>
      <p><strong>Perusahaan:</strong> ${escapeHtml(companyName)}</p>
      <p><strong>Total:</strong> ${escapeHtml(safeTotal)}</p>
      <p><strong>Produk:</strong> ${escapeHtml(productSummary)}</p>
      <p><a href="${escapeHtml(adminUrl)}">Buka order di Ofissio Admin</a></p>
    </div>`;
  const result = await sendEmail({
    type: "order_created_internal",
    companyId: null,
    userId: null,
    to: config.recipients,
    subject,
    html,
    text,
    safeMetadata: {
      idempotencyKey: orderNotificationEmailIdempotencyKey(notification.entityId),
      notificationId: notification.id,
      orderId: notification.entityId,
      orderNumber,
    },
    request,
  });
  return { kind: result.status as "sent" | "mocked" | "failed" | "skipped", result };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
