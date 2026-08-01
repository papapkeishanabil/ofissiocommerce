"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { InternalRole } from "@/lib/security/security.types";
import type {
  AdminNotification,
  AdminNotificationSummary,
} from "../admin-notification.types";

type NotificationAction = "read" | "acknowledge" | "resolve";

interface AdminNotificationContextValue {
  summary: AdminNotificationSummary;
  loading: boolean;
  refresh: () => Promise<void>;
  mutate: (id: string, action: NotificationAction) => Promise<boolean>;
  request: (path: string, init?: RequestInit) => Promise<Response>;
}

const EMPTY_SUMMARY: AdminNotificationSummary = {
  totalUnread: 0,
  ordersUnread: 0,
  orderPopupUnread: 0,
  latestOrderNotifications: [],
};

const AdminNotificationContext = createContext<AdminNotificationContextValue | null>(null);

export function AdminNotificationProvider({
  children,
  role,
  userId,
}: {
  children: ReactNode;
  role: InternalRole;
  userId: string;
}) {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);

  const request = useCallback(
    (path: string, init: RequestInit = {}) =>
      fetch(path, {
        ...init,
        cache: "no-store",
        headers: {
          "x-ofissio-internal-role": role,
          "x-ofissio-internal-user-id": userId,
          ...init.headers,
        },
      }),
    [role, userId],
  );

  const refresh = useCallback(async () => {
    try {
      const response = await request("/api/admin/notifications/summary");
      if (!response.ok) return;
      const payload = (await response.json()) as Partial<AdminNotificationSummary>;
      setSummary({
        totalUnread: Number(payload.totalUnread ?? 0),
        ordersUnread: Number(payload.ordersUnread ?? 0),
        orderPopupUnread: Number(payload.orderPopupUnread ?? 0),
        latestOrderNotifications: Array.isArray(payload.latestOrderNotifications)
          ? (payload.latestOrderNotifications as AdminNotification[])
          : [],
      });
    } catch {
      // A temporary network issue should not spam the browser console or break admin pages.
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh]);

  const mutate = useCallback(
    async (id: string, action: NotificationAction) => {
      try {
        const response = await request(
          `/api/admin/notifications/${encodeURIComponent(id)}/${action}`,
          { method: "PATCH" },
        );
        if (!response.ok) return false;
        await refresh();
        return true;
      } catch {
        return false;
      }
    },
    [refresh, request],
  );

  const value = useMemo(
    () => ({ summary, loading, refresh, mutate, request }),
    [summary, loading, refresh, mutate, request],
  );
  return (
    <AdminNotificationContext.Provider value={value}>
      {children}
    </AdminNotificationContext.Provider>
  );
}

export function useAdminNotifications() {
  const context = useContext(AdminNotificationContext);
  if (!context) {
    throw new Error("useAdminNotifications harus berada di AdminNotificationProvider.");
  }
  return context;
}
