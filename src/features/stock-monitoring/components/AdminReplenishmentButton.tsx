"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Factory } from "lucide-react";

import type { ReplenishmentReason } from "../stock-monitoring.types";

interface AdminReplenishmentButtonProps {
  orderId?: string | null;
  parentSku: string;
  stockSku: string;
  reason: ReplenishmentReason;
  initialRequested?: boolean;
}

export function AdminReplenishmentButton({
  orderId = null,
  parentSku,
  stockSku,
  reason,
  initialRequested = false,
}: AdminReplenishmentButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState(initialRequested);
  const [message, setMessage] = useState("");

  async function submit() {
    if (busy || requested) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        "/api/admin/stock-monitoring/replenishment-requests",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, parentSku, stockSku, reason }),
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || "Request belum dapat dibuat.");
      }
      setRequested(true);
      setMessage("Request produksi tercatat.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request belum dapat dibuat.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={submit}
        disabled={busy || requested}
        aria-busy={busy}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-3 py-2 text-sm font-extrabold text-white transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
      >
        <Factory className="h-4 w-4" aria-hidden="true" />
        {requested ? "Request sudah dibuat" : busy ? "Membuat request…" : "Buat Request Produksi"}
      </button>
      {message ? (
        <p
          className={`mt-2 text-xs font-semibold ${requested ? "text-emerald-700" : "text-red-700"}`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
