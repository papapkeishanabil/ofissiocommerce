"use client";

import { BellRing, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { useAdminNotifications } from "./AdminNotificationProvider";

type PushState = "loading" | "unsupported" | "unconfigured" | "blocked" | "inactive" | "active" | "working";

export function AdminPushToggle() {
  const { request } = useAdminNotifications();
  const [state, setState] = useState<PushState>("loading");
  const [publicKey, setPublicKey] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || (!("PushManager" in window)) || (!("Notification" in window))) {
      setState("unsupported");
      return;
    }
    void request("/api/admin/notifications/push-subscription")
      .then((response) => response.json())
      .then(async (payload: { configured?: boolean; publicKey?: string }) => {
        if (!payload.configured || !payload.publicKey) {
          setState("unconfigured");
          return;
        }
        setPublicKey(payload.publicKey);
        if (Notification.permission === "denied") {
          setState("blocked");
          return;
        }
        const registration = await navigator.serviceWorker.register("/ofissio-push-sw.js");
        const subscription = await registration.pushManager.getSubscription();
        setState(subscription ? "active" : "inactive");
      })
      .catch(() => setState("inactive"));
  }, [request]);

  async function activate() {
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "inactive");
        return;
      }
      const registration = await navigator.serviceWorker.register("/ofissio-push-sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(publicKey),
      });
      const response = await request("/api/admin/notifications/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error("subscription_failed");
      setState("active");
    } catch {
      setState("inactive");
    }
  }

  if (state === "loading" || state === "unsupported") return null;
  const active = state === "active";
  return (
    <button
      type="button"
      onClick={activate}
      disabled={active || state === "working" || state === "blocked" || state === "unconfigured"}
      title={state === "blocked" ? "Izinkan notifikasi melalui pengaturan browser" : state === "unconfigured" ? "Konfigurasi VAPID belum tersedia" : undefined}
      className={`hidden min-h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-semibold transition sm:inline-flex ${active ? "bg-emerald-50 text-emerald-700" : state === "blocked" ? "cursor-not-allowed bg-red-50 text-red-700" : "bg-brand-50 text-brand-700 hover:bg-brand-100"}`}
    >
      {state === "working" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" />}
      {active ? "Notifikasi aktif" : state === "blocked" ? "Notifikasi diblokir" : state === "unconfigured" ? "Push belum siap" : "Aktifkan notifikasi"}
    </button>
  );
}

function base64UrlToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}
