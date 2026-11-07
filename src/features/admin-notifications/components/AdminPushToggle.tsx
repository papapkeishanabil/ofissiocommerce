"use client";

import { BellRing, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { useAdminNotifications } from "./AdminNotificationProvider";

type PushState = "loading" | "unsupported" | "unconfigured" | "blocked" | "inactive" | "active" | "working" | "error";

export function AdminPushToggle({ expanded = false }: { expanded?: boolean }) {
  const { request } = useAdminNotifications();
  const [state, setState] = useState<PushState>("loading");
  const [publicKey, setPublicKey] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || (!("PushManager" in window)) || (!("Notification" in window))) {
      setState("unsupported");
      return;
    }
    let disposed = false;
    const check = () => { void request("/api/admin/notifications/push-subscription", { signal: AbortSignal.timeout(12000) })
      .then((response) => { if (!response.ok) throw new Error("config_failed"); return response.json(); })
      .then(async (payload: { configured?: boolean; publicKey?: string }) => {
        if (disposed) return;
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
        if (subscription) {
          const response = await request("/api/admin/notifications/push-subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()), signal: AbortSignal.timeout(12000) });
          if (!response.ok) throw new Error("subscription_failed");
        }
        if (disposed) return;
        setState(subscription ? "active" : "inactive");
      })
      .catch(() => { if (!disposed) { setState("error"); setFeedback("Status notifikasi belum dapat diperiksa. Coba lagi."); } }); };
    check();
    window.addEventListener("ofissio-push-changed", check);
    return () => { disposed = true; window.removeEventListener("ofissio-push-changed", check); };
  }, [request]);

  async function activate() {
    if (state === "blocked") { setFeedback("Izinkan notifikasi Ofissio melalui pengaturan situs pada browser, lalu muat ulang halaman."); return; }
    if (state === "unsupported") { setFeedback("Browser ini belum mendukung notifikasi. Pada iPhone/iPad, tambahkan Ofissio ke Layar Utama dan buka dari ikon aplikasi."); return; }
    if (state === "unconfigured") { setFeedback("Notifikasi perangkat belum tersedia. Hubungi pengelola sistem."); return; }
    if (state === "error" && !publicKey) { setState("loading"); window.dispatchEvent(new Event("ofissio-push-changed")); return; }
    const wasActive = state === "active";
    setState("working");
    setFeedback("");
    try {
      if (wasActive) {
        const registration = await navigator.serviceWorker.register("/ofissio-push-sw.js");
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const response = await request("/api/admin/notifications/push-subscription", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }), signal: AbortSignal.timeout(12000) });
          if (!response.ok) throw new Error("unsubscribe_failed");
          await subscription.unsubscribe();
        }
        setState("inactive"); window.dispatchEvent(new Event("ofissio-push-changed")); return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "inactive");
        setFeedback(permission === "denied" ? "Notifikasi diblokir. Ubah izin situs pada pengaturan browser." : "Izin belum diberikan. Tekan tombol lagi lalu pilih Izinkan.");
        return;
      }
      const registration = await navigator.serviceWorker.register("/ofissio-push-sw.js");
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(publicKey),
      });
      const response = await request("/api/admin/notifications/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error("subscription_failed");
      setState("active");
      window.dispatchEvent(new Event("ofissio-push-changed"));
    } catch {
      setState(wasActive ? "active" : "error");
      setFeedback("Pengaturan notifikasi belum tersimpan. Periksa koneksi lalu coba lagi.");
    }
  }

  if (!expanded && (state === "loading" || state === "unsupported")) return null;
  const active = state === "active";
  return (
    <span className="inline-flex max-w-full flex-col gap-1"><button
      type="button"
      onClick={activate}
      disabled={state === "working" || state === "loading"}
      aria-pressed={active}
      title={state === "blocked" ? "Izinkan notifikasi melalui pengaturan browser" : state === "unconfigured" ? "Konfigurasi VAPID belum tersedia" : undefined}
      className={`${expanded ? "inline-flex min-h-11 border border-[#d4deef]" : "hidden min-h-9 sm:inline-flex"} items-center gap-2 rounded-lg px-3 text-xs font-semibold transition ${active ? "bg-emerald-50 text-emerald-700" : state === "blocked" ? "bg-red-50 text-red-700" : "bg-white text-brand-700 hover:bg-brand-50"}`}
    >
      {state === "working" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" />}
      {active ? "Notifikasi aktif" : state === "loading" ? "Memeriksa notifikasi..." : state === "working" ? "Menyimpan..." : state === "blocked" ? "Notifikasi diblokir" : state === "unsupported" ? "Panduan notifikasi HP" : state === "unconfigured" ? "Push belum siap" : state === "error" ? "Coba notifikasi lagi" : "Aktifkan notifikasi"}
    </button>
    {expanded && active && <button type="button" className="min-h-10 rounded-lg px-2 text-xs font-semibold text-[#122162] underline" onClick={async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification("Tes notifikasi Ofissio", { body: "Popup perangkat berfungsi. Suaranya mengikuti pengaturan Windows/HP.", tag: "ofissio-device-test", icon: "/brand/app-icon-192-v1.png", silent: false, data: { url: "/admin/chats" } });
        setFeedback("Tes dikirim ke perangkat. Jika popup tidak terlihat, izinkan banner dan suara browser pada pengaturan notifikasi Windows/HP serta matikan Jangan Ganggu.");
      } catch { setFeedback("Popup belum dapat ditampilkan. Periksa izin notifikasi browser dan perangkat."); }
    }}>Tes popup perangkat</button>}
    {feedback && <span role="status" className="max-w-72 text-xs leading-relaxed text-[#526384]">{feedback}</span>}</span>
  );
}

function base64UrlToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}
