"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { ProcessOrderEventType } from "@/features/process-orders/process-order.types";
import { cn } from "@/lib/utils";

interface AdminProcessOrderEventComposerProps {
  processOrderId: string;
  canUpdate: boolean;
}

export function AdminProcessOrderEventComposer({
  processOrderId,
  canUpdate,
}: AdminProcessOrderEventComposerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [eventType, setEventType] = useState<Extract<ProcessOrderEventType, "note_added" | "event_added">>("note_added");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  function submitEvent() {
    const normalizedNote = note.trim();
    if (!normalizedNote) {
      setHasError(true);
      setMessage("Tuliskan catatan atau aktivitas sebelum menyimpan.");
      return;
    }

    setMessage(null);
    setHasError(false);
    startTransition(async () => {
      const response = await fetch(
        `/api/admin/process-orders/${encodeURIComponent(processOrderId)}/events`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-ofissio-internal-role": "super_admin",
            "x-ofissio-internal-user-id": "internal-dev",
          },
          body: JSON.stringify({ eventType, note: normalizedNote }),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok) {
        setHasError(true);
        setMessage(result.message ?? "Aktivitas operasional belum dapat disimpan.");
        return;
      }

      setNote("");
      setMessage("Aktivitas tersimpan di timeline process order.");
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-soft-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
          <MessageSquarePlus className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-extrabold text-ink">Catat aktivitas operasional</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Tambahkan perkembangan, kendala, atau keputusan internal tanpa menampilkannya kepada customer.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)_auto] lg:items-end">
        <label className="grid gap-1.5 text-sm font-bold text-ink">
          Jenis catatan
          <select
            value={eventType}
            onChange={(event) =>
              setEventType(event.target.value as "note_added" | "event_added")
            }
            disabled={!canUpdate || isPending}
            className="min-h-11 rounded-lg border border-line bg-white px-3 font-normal outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100"
          >
            <option value="note_added">Catatan operasional</option>
            <option value="event_added">Perkembangan / kendala</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-ink">
          Catatan
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={!canUpdate || isPending}
            maxLength={1000}
            rows={2}
            placeholder="Contoh: Hasil bordir masuk QC dan menunggu pemeriksaan warna benang."
            className="min-h-11 resize-y rounded-lg border border-line bg-white px-3 py-2.5 font-normal outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100"
          />
        </label>
        <Button
          type="button"
          onClick={submitEvent}
          disabled={!canUpdate || isPending}
          aria-busy={isPending}
          className="min-h-11"
        >
          {isPending ? "Menyimpan..." : "Simpan aktivitas"}
        </Button>
      </div>

      {message ? (
        <p
          className={cn(
            "mt-4 rounded-lg px-3 py-2 text-sm font-semibold",
            hasError ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800",
          )}
          role="status"
        >
          {message}
        </p>
      ) : null}
      {!canUpdate ? (
        <p className="mt-4 text-xs font-semibold text-ink-muted">
          Role Anda memiliki akses lihat saja untuk catatan operasional.
        </p>
      ) : null}
    </section>
  );
}
