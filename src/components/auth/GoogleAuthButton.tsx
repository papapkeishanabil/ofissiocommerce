"use client";

import { useState } from "react";
import { useUIStore } from "@/stores/ui-store";

export function GoogleAuthButton({ quotationId }: { quotationId?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const intent = useUIStore((s) => s.authIntent);
  async function start() {
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams(window.location.search);
      const next = quotationId ? `/quotes/${quotationId}`
        : intent.kind === "checkout" ? "/checkout"
        : intent.kind === "request_quote" ? intent.returnTo ?? "/quote"
        : params.get("next") ?? "/dashboard";
      const response = await fetch(`/api/auth/google?${new URLSearchParams({ next })}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.message ?? "Google belum dapat dihubungi.");
      window.location.assign(payload.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Silakan coba lagi atau gunakan email.");
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <button type="button" onClick={start} disabled={busy} aria-busy={busy} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:bg-cool-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-wait disabled:opacity-60">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96Z"/></svg>
        {busy ? "Menghubungkan ke Google..." : "Lanjutkan dengan Google"}
      </button>
      {error && <p role="alert" className="text-xs leading-5 text-red-700">{error}</p>}
      <div className="flex items-center gap-3 text-xs text-ink-subtle"><span className="h-px flex-1 bg-line" />atau gunakan email<span className="h-px flex-1 bg-line" /></div>
    </div>
  );
}
