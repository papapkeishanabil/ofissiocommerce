"use client";

import { useEffect } from "react";

import { useAdminNotifications } from "./AdminNotificationProvider";

export function AdminQuotationNotificationRead({
  notification,
}: {
  notification: {
    id: string;
    status: "unread" | "read" | "acknowledged" | "resolved";
  } | null;
}) {
  const { mutate } = useAdminNotifications();

  useEffect(() => {
    if (notification?.status === "unread") {
      void mutate(notification.id, "read");
    }
  }, [mutate, notification]);

  return null;
}
