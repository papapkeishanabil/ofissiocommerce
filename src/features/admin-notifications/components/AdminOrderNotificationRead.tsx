"use client";

import { useEffect } from "react";

import { useAdminNotifications } from "./AdminNotificationProvider";

export function AdminOrderNotificationRead({
  notifications,
}: {
  notifications: Array<{
    id: string;
    status: "unread" | "read" | "acknowledged" | "resolved";
  }>;
}) {
  const { mutate } = useAdminNotifications();

  useEffect(() => {
    notifications.forEach((notification) => {
      if (notification.status === "unread") void mutate(notification.id, "read");
    });
  }, [mutate, notifications]);

  return null;
}
