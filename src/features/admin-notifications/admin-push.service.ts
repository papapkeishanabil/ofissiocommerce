import "server-only";

import { randomUUID } from "node:crypto";
import webpush from "web-push";

import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import { logInternalError } from "@/lib/security/safe-error-response";
import type { InternalRole } from "@/lib/security/security.types";
import type { AdminNotification } from "./admin-notification.types";

export interface AdminPushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface AdminPushDispatchResult {
  status: "sent" | "partial" | "failed" | "not_configured" | "no_subscribers";
  eligible: number;
  sent: number;
  failed: number;
}

export function getPublicVapidKey() {
  return process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim() ?? "";
}

export function isAdminWebPushConfigured() {
  return Boolean(
    getPublicVapidKey() &&
      process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim() &&
      process.env.WEB_PUSH_SUBJECT?.trim(),
  );
}

export async function saveAdminPushSubscription(input: {
  userId: string;
  role: InternalRole;
  subscription: AdminPushSubscriptionInput;
  userAgent?: string | null;
}) {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Penyimpanan push membutuhkan Supabase.");
  const endpoint = input.subscription.endpoint.trim();
  const existing = await client.select("admin_push_subscriptions", {
    filters: { endpoint },
    limit: 1,
  });
  const row = {
    user_id: input.userId,
    recipient_role: input.role,
    endpoint,
    p256dh: input.subscription.keys.p256dh,
    auth: input.subscription.keys.auth,
    user_agent: input.userAgent?.slice(0, 500) ?? null,
    active: true,
    updated_at: new Date().toISOString(),
  };
  if (existing[0]) {
    await client.update("admin_push_subscriptions", row, { id: String(existing[0].id) });
  } else {
    await client.insert("admin_push_subscriptions", { id: `aps_${randomUUID()}`, ...row });
  }
}

export async function removeAdminPushSubscription(endpoint: string, userId: string) {
  const client = getSupabaseAdminClient();
  if (!client) return;
  await client.update(
    "admin_push_subscriptions",
    { active: false, updated_at: new Date().toISOString() },
    { endpoint, user_id: userId },
  );
}

export async function sendAdminWebPush(
  notification: AdminNotification,
): Promise<AdminPushDispatchResult> {
  if (!isAdminWebPushConfigured()) {
    return { status: "not_configured", eligible: 0, sent: 0, failed: 0 };
  }
  const client = getSupabaseAdminClient();
  if (!client) return { status: "failed", eligible: 0, sent: 0, failed: 1 };

  webpush.setVapidDetails(
    process.env.WEB_PUSH_SUBJECT!.trim(),
    getPublicVapidKey(),
    process.env.WEB_PUSH_VAPID_PRIVATE_KEY!.trim(),
  );
  const rows = await client.select("admin_push_subscriptions", {
    filters: { active: true },
  });
  const eligible = rows.filter((row) =>
    (!notification.recipientRole || row.recipient_role === notification.recipientRole) &&
    (!notification.recipientUserId || row.user_id === notification.recipientUserId),
  );
  const url = String(notification.metadata.adminUrl ?? "/admin/notifications");
  if (!eligible.length) return { status: "no_subscribers", eligible: 0, sent: 0, failed: 0 };
  const outcomes = await Promise.all(eligible.map(async (row) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: String(row.endpoint),
          keys: { p256dh: String(row.p256dh), auth: String(row.auth) },
        },
        JSON.stringify({
          title: notification.title,
          body: notification.message,
          url,
          tag: notification.id,
        }),
      );
      return true;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await client.update(
          "admin_push_subscriptions",
          { active: false, updated_at: new Date().toISOString() },
          { id: String(row.id) },
        );
        return false;
      }
      logInternalError(error, { area: "admin_web_push", notificationId: notification.id });
      return false;
    }
  }));
  const sent = outcomes.filter(Boolean).length;
  const failed = outcomes.length - sent;
  return {
    status: failed === 0 ? "sent" : sent > 0 ? "partial" : "failed",
    eligible: eligible.length,
    sent,
    failed,
  };
}
