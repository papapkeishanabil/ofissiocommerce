"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from "react";

import type { InternalRole } from "@/lib/security/security.types";
import { ADMIN_ROLE_PERMISSIONS } from "@/features/admin/admin.config";
import { playChatSound } from "@/features/ofistant-support/chat-sound";
import type {
  AdminNotification,
  AdminNotificationSummary,
} from "../admin-notification.types";

type NotificationAction = "read" | "acknowledge" | "resolve";

interface AdminNotificationContextValue {
  chatWaiting: number | null;
  chatSessionInvalid: boolean;
  summary: AdminNotificationSummary;
  loading: boolean;
  refresh: () => Promise<void>;
  mutate: (id: string, action: NotificationAction) => Promise<boolean>;
  request: (path: string, init?: RequestInit) => Promise<Response>;
}

const EMPTY_SUMMARY: AdminNotificationSummary = {
  totalUnread: 0,
  ordersUnread: 0,
  quotationsUnread: 0,
  requestsUnread: 0,
  officialQuotationsUnread: 0,
  workOrdersUnread: 0,
  popupUnread: 0,
  latestNotifications: [],
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
  const [chatWaiting, setChatWaiting] = useState<number | null>(null);
  const [chatSessionInvalid, setChatSessionInvalid] = useState(false);
  const canManageChat = ADMIN_ROLE_PERMISSIONS[role].includes("admin:chat:manage");
  const seenChats = useRef<Set<string> | null>(null);
  const chatOwner = useRef(userId);

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

  useEffect(() => {
    if (!canManageChat) return;
    let disposed = false;
    let invalidSession = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        if (document.visibilityState === "visible") {
          const response = await request("/api/admin/chats?status=waiting", { signal: AbortSignal.timeout(12000) });
          if (disposed) return;
          if (response.status === 401 || response.status === 403) {
            invalidSession = true; setChatWaiting(null); setChatSessionInvalid(true); return;
          }
          if (!response.ok) { setChatWaiting(null); return; }
          const body = await response.json();
          if (!disposed) { setChatWaiting(body.result.conversations.length); setChatSessionInvalid(false); }
        }
      } catch { if (!disposed) setChatWaiting(null); }
      finally { if (!disposed && !invalidSession) timer = setTimeout(poll, 10000); }
    }
    void poll();
    return () => { disposed = true; clearTimeout(timer); };
  }, [canManageChat, request]);

  const refresh = useCallback(async () => {
    try {
      const response = await request("/api/admin/notifications/summary");
      if (response.status === 401 || response.status === 403) {
        setSummary(EMPTY_SUMMARY); seenChats.current = null; return;
      }
      if (!response.ok) return;
      const payload = (await response.json()) as Partial<AdminNotificationSummary>;
      const chatNotices = payload.latestChatNotifications ?? [];
      if (chatOwner.current !== userId) { seenChats.current = null; chatOwner.current = userId; }
      const newChat = seenChats.current !== null && chatNotices.some((item) => !seenChats.current!.has(item.id) && item.status === "unread");
      seenChats.current = new Set(chatNotices.map((item) => item.id));
      if (canManageChat && newChat && document.visibilityState === "visible" && document.hasFocus()) playChatSound();
      setSummary({
        latestChatNotifications: chatNotices,
        totalUnread: Number(payload.totalUnread ?? 0),
        ordersUnread: Number(payload.ordersUnread ?? 0),
        quotationsUnread: Number(payload.quotationsUnread ?? 0),
        requestsUnread: Number(payload.requestsUnread ?? payload.quotationsUnread ?? 0),
        officialQuotationsUnread: Number(payload.officialQuotationsUnread ?? 0),
        workOrdersUnread: Number(payload.workOrdersUnread ?? 0),
        popupUnread: Number(payload.popupUnread ?? payload.orderPopupUnread ?? 0),
        latestNotifications: Array.isArray(payload.latestNotifications)
          ? (payload.latestNotifications as AdminNotification[])
          : Array.isArray(payload.latestOrderNotifications)
            ? (payload.latestOrderNotifications as AdminNotification[])
            : [],
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
  }, [request, userId, canManageChat]);

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
    () => ({ summary, loading, refresh, mutate, request, chatWaiting, chatSessionInvalid }),
    [summary, loading, refresh, mutate, request, chatWaiting, chatSessionInvalid],
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
