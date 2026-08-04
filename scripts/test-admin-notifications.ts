import assert from "node:assert/strict";

import { createAdminNotificationManager } from "../src/features/admin-notifications/admin-notification.core";
import type { AdminNotification } from "../src/features/admin-notifications/admin-notification.types";
import {
  isOrderNotificationEmailEnabled,
  orderNotificationEmailIdempotencyKey,
} from "../src/features/admin-notifications/admin-notification.utils";
import type { AdminNotificationRepository } from "../src/features/repositories/repository.types";

const rows = new Map<string, AdminNotification>();
const repository: AdminNotificationRepository = {
  async create(notification) {
    const duplicate = [...rows.values()].find(
      (row) =>
        row.type === notification.type &&
        row.entityType === notification.entityType &&
        row.entityId === notification.entityId,
    );
    if (duplicate) return duplicate;
    rows.set(notification.id, notification);
    return notification;
  },
  async getById(id) {
    return rows.get(id) ?? null;
  },
  async getByEntity(input) {
    return [...rows.values()].find(
      (row) =>
        row.type === input.type &&
        row.entityType === input.entityType &&
        row.entityId === input.entityId,
    ) ?? null;
  },
  async listAll() {
    return [...rows.values()];
  },
  async update(id, patch) {
    const current = rows.get(id);
    if (!current) return null;
    const next = { ...current, ...patch };
    rows.set(id, next);
    return next;
  },
  async claimEmail(id, claimId) {
    const current = rows.get(id);
    if (!current || current.emailStatus !== "pending" || current.emailId) return false;
    rows.set(id, { ...current, emailId: claimId });
    return true;
  },
};

async function main() {
  const manager = createAdminNotificationManager(repository);
  const input = {
    type: "order_created" as const,
    title: "Order Baru Masuk",
    message: "Order OF-001 dari PT Demo",
    entityType: "order",
    entityId: "ord_test_001",
    entityNumber: "OF-001",
    metadata: { orderId: "ord_test_001" },
  };
  const first = await manager.create(input);
  const duplicate = await manager.create(input);
  assert.equal(first.created, true, "create pertama harus membuat notification");
  assert.equal(duplicate.created, false, "duplicate harus mengembalikan row existing");
  assert.equal(rows.size, 1, "duplicate tidak boleh menambah row");

  const scope = { role: "sales" as const, userId: "sales-test" };
  assert.equal((await manager.summary(scope)).ordersUnread, 1);

  const requestedQuotation = await manager.create({
    type: "quotation_requested",
    title: "Permintaan Full Custom Baru",
    message: "PT Demo mengajukan Full Custom.",
    entityType: "quotation",
    entityId: "quo_test_001",
    entityNumber: "OF-QUO-001",
    metadata: {
      adminUrl: "/admin/quotations/quo_test_001",
      source: "custom_request",
      totalQty: 100,
    },
  });
  let quotationSummary = await manager.summary(scope);
  assert.equal(quotationSummary.quotationsUnread, 1);
  assert.equal(quotationSummary.popupUnread, 2);
  assert.equal(
    quotationSummary.latestNotifications.some(
      (notification) => notification.id === requestedQuotation.notification.id,
    ),
    true,
    "quotation request harus tampil pada sticky popup",
  );

  const acceptedQuotation = await manager.create({
    type: "quotation_accepted",
    title: "Quotation Diterima Customer",
    message: "Quotation OF-QUO-001 telah diterima.",
    entityType: "quotation",
    entityId: "quo_test_001",
    entityNumber: "OF-QUO-001",
    metadata: { adminUrl: "/admin/quotations/quo_test_001" },
  });
  quotationSummary = await manager.summary(scope);
  assert.equal(quotationSummary.quotationsUnread, 2);
  assert.equal(quotationSummary.popupUnread, 3);
  assert.equal(
    quotationSummary.latestNotifications.some(
      (notification) => notification.id === acceptedQuotation.notification.id,
    ),
    true,
    "quotation accepted harus tampil pada sticky popup",
  );
  await manager.transition(acceptedQuotation.notification.id, "read");
  quotationSummary = await manager.summary(scope);
  assert.equal(quotationSummary.quotationsUnread, 1);
  assert.equal(quotationSummary.popupUnread, 2);
  await manager.transition(requestedQuotation.notification.id, "read");
  quotationSummary = await manager.summary(scope);
  assert.equal(quotationSummary.quotationsUnread, 0);
  assert.equal(quotationSummary.popupUnread, 1);

  await manager.transition(first.notification.id, "read");
  let summary = await manager.summary(scope);
  assert.equal(summary.ordersUnread, 0, "membuka detail mengurangi badge Orders");
  assert.equal(summary.orderPopupUnread, 0, "read boleh menyembunyikan sticky popup");

  await manager.transition(first.notification.id, "acknowledged");
  summary = await manager.summary(scope);
  assert.equal(summary.ordersUnread, 0, "acknowledge mengurangi badge Orders");

  const second = await manager.create({ ...input, entityId: "ord_test_002", entityNumber: "OF-002" });
  const paid = await manager.create({
    type: "payment_paid",
    title: "Pembayaran Order Diterima",
    message: "Pembayaran OF-002 sudah diterima.",
    entityType: "order",
    entityId: "ord_test_002",
    entityNumber: "OF-002",
    metadata: { adminUrl: "/admin/orders/ord_test_002" },
  });
  summary = await manager.summary(scope);
  assert.equal(summary.ordersUnread, 2, "order baru dan pembayaran baru masuk badge Orders");
  assert.equal(
    summary.latestNotifications.some(
      (notification) => notification.id === paid.notification.id,
    ),
    true,
    "pembayaran baru harus tampil pada sticky popup",
  );
  await manager.resolveOrder(second.notification.entityId);
  summary = await manager.summary(scope);
  assert.equal(
    summary.ordersUnread,
    0,
    "mulai proses menyelesaikan notifikasi order dan pembayaran",
  );

  assert.equal(
    orderNotificationEmailIdempotencyKey("ord_test_001"),
    orderNotificationEmailIdempotencyKey("ord_test_001"),
    "email idempotency key harus stabil",
  );
  assert.equal(isOrderNotificationEmailEnabled(undefined), false);
  assert.equal(isOrderNotificationEmailEnabled("false"), false);
  assert.equal(isOrderNotificationEmailEnabled("true"), true);

  const emailNotification = await manager.create({
    ...input,
    entityId: "ord_email_001",
    entityNumber: "OF-EMAIL-001",
    emailStatus: "pending",
  });
  assert.equal(
    await repository.claimEmail(
      emailNotification.notification.id,
      orderNotificationEmailIdempotencyKey("ord_email_001"),
    ),
    true,
  );
  assert.equal(
    await repository.claimEmail(
      emailNotification.notification.id,
      orderNotificationEmailIdempotencyKey("ord_email_001"),
    ),
    false,
    "email claim kedua harus ditolak",
  );

  console.log("Admin notification tests: PASS");
  console.log("- create + duplicate idempotency: PASS");
  console.log("- unread/read/acknowledged/resolved badge rules: PASS");
  console.log("- sticky read behavior: PASS");
  console.log("- quotation requested badge + sticky popup: PASS");
  console.log("- quotation accepted badge + sticky popup: PASS");
  console.log("- payment paid badge + sticky popup + process resolution: PASS");
  console.log("- email idempotency key + disabled fallback: PASS");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Admin notification test failed.");
  process.exitCode = 1;
});
