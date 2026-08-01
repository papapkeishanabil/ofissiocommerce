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

  await manager.transition(first.notification.id, "read");
  let summary = await manager.summary(scope);
  assert.equal(summary.ordersUnread, 1, "read tetap dihitung pada badge Orders");
  assert.equal(summary.orderPopupUnread, 0, "read boleh menyembunyikan sticky popup");

  await manager.transition(first.notification.id, "acknowledged");
  summary = await manager.summary(scope);
  assert.equal(summary.ordersUnread, 0, "acknowledge mengurangi badge Orders");

  const second = await manager.create({ ...input, entityId: "ord_test_002", entityNumber: "OF-002" });
  await manager.resolveOrder(second.notification.entityId);
  summary = await manager.summary(scope);
  assert.equal(summary.ordersUnread, 0, "resolved tidak dihitung pada badge Orders");

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
  console.log("- email idempotency key + disabled fallback: PASS");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Admin notification test failed.");
  process.exitCode = 1;
});
