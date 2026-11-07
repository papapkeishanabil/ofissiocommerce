import assert from "node:assert/strict";
import { chatNotificationInput, canReceiveChatNotification, isLiveChatNotification } from "../src/features/ofistant-support/support-notification";
import { createAdminNotificationManager } from "../src/features/admin-notifications/admin-notification.core";
import { isNotificationVisibleToScope } from "../src/features/admin-notifications/admin-notification.utils";
import type { AdminNotification } from "../src/features/admin-notifications/admin-notification.types";
import type { AdminNotificationRepository } from "../src/features/repositories/repository.types";
import type { InternalRole } from "../src/lib/security/security.types";

async function main() {
  const rows: AdminNotification[] = [];
  const repository = {
    getByEntity: async (input: {entityId: string}) => rows.find((row) => row.entityId === input.entityId) ?? null,
    create: async (notification: AdminNotification) => {
      const existing = rows.find((row) => row.entityId === notification.entityId);
      if (existing) return existing;
      rows.push(notification); return notification;
    },
    listAll: async () => rows,
  } as unknown as AdminNotificationRepository;
  const manager = createAdminNotificationManager(repository);
  const conversation = { id: "e09465b5-631e-4c4c-9745-1cc5c09276ba", customerName: "Private customer", status: "waiting" as const, staffId: null, staffName: null, updatedAt: new Date().toISOString() };
  const input = chatNotificationInput(conversation, "event-1", true);
  assert(!input.message.includes(conversation.customerName));
  assert.equal(input.metadata?.adminUrl, `/admin/chats?conversation=${conversation.id}`);
  const results = await Promise.all([manager.create(input), manager.create(input)]);
  assert.equal(results.filter((item) => item.created).length, 1, "Concurrent retry must dispatch only once");
  assert.equal((await manager.create(input)).created, false);
  const notice = results[0].notification;
  assert(isLiveChatNotification(notice));
  for (const role of ["super_admin", "sales_admin", "sales"] as InternalRole[]) {
    assert(canReceiveChatNotification(notice, { role, userId: "staff" }));
    assert(isNotificationVisibleToScope(notice, { role, userId: "staff" }));
  }
  assert(!canReceiveChatNotification(notice, { role: "support", userId: "staff" }));
  const assigned = await manager.create(chatNotificationInput({ ...conversation, status: "active", staffId: "owner" }, "event-2", false));
  assert(canReceiveChatNotification(assigned.notification, { role: "sales", userId: "owner" }));
  assert(!canReceiveChatNotification(assigned.notification, { role: "super_admin", userId: "other" }));
  assert(!isNotificationVisibleToScope(assigned.notification, { role: "sales", userId: "other" }));
  assert.equal((await manager.summary({ role: "sales", userId: "owner" })).latestChatNotifications.length, 2);
  assert.equal((await manager.summary({ role: "support", userId: "staff" })).latestChatNotifications.length, 0);
  for (let i = 0; i < 60; i++) await manager.create(chatNotificationInput({ ...conversation, status: "active", staffId: "owner" }, `bulk-${i}`, false));
  rows[0]!.status = "read";
  const summary = await manager.summary({ role: "sales", userId: "owner" });
  assert.equal(summary.chatUnread, 61, "Count includes assigned active messages beyond preview limit");
  assert.equal(summary.chatUnreadByConversation?.[conversation.id], 61);
  assert.equal(summary.latestChatNotifications.length, 50);
  assert(summary.latestChatNotifications.every((item) => item.status === "unread"));
  assert.equal((await manager.summary({ role: "sales", userId: "other" })).chatUnread, 0);
  console.log("PASS: chat recipients, privacy, deep links, concurrent retry deduplication, summary visibility");
}
void main();
