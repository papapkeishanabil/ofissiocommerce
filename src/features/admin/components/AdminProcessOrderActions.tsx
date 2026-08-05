"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import type {
  ProcessOrder,
  ProcessOrderPatch,
  ProcessOrderTask,
} from "@/features/process-orders/process-order.types";
import { cn } from "@/lib/utils";

interface AdminProcessOrderActionsProps {
  processOrder: ProcessOrder;
  tasks: ProcessOrderTask[];
  canUpdate: boolean;
}

export function AdminProcessOrderActions({
  processOrder,
  tasks,
  canUpdate,
}: AdminProcessOrderActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [assignedTeam, setAssignedTeam] = useState(processOrder.assignedTeam ?? "");
  const [deadline, setDeadline] = useState(processOrder.deadline?.slice(0, 10) ?? "");
  const [priority, setPriority] = useState(processOrder.priority);
  const [notes, setNotes] = useState(processOrder.notes ?? "");
  const allTasksCompleted = tasks.length > 0 && tasks.every((task) => task.status === "completed");

  function patchProcessOrder(patch: ProcessOrderPatch, successMessage: string) {
    runAction(async () => {
      return fetch(`/api/admin/process-orders/${encodeURIComponent(processOrder.id)}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-ofissio-internal-role": "super_admin",
          "x-ofissio-internal-user-id": "internal-dev",
        },
        body: JSON.stringify(patch),
      });
    }, successMessage);
  }

  function saveSettings() {
    patchProcessOrder(
      {
        assignedTeam: assignedTeam.trim() || null,
        deadline: deadline || null,
        priority,
        notes: notes.trim() || null,
      },
      "Pengaturan operasional berhasil disimpan.",
    );
  }

  function runAction(action: () => Promise<Response>, successMessage: string) {
    setMessage(null);
    setHasError(false);
    startTransition(async () => {
      const response = await action();
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok) {
        setHasError(true);
        setMessage(result.message ?? "Pengaturan process order belum dapat disimpan.");
        return;
      }
      setMessage(successMessage);
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-soft-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-ink">Pengaturan operasional</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Tentukan tim, tenggat, prioritas, dan instruksi kerja. Pengaturan ini hanya terlihat oleh tim internal.
          </p>
        </div>
        {message ? (
          <p
            className={cn(
              "rounded-lg px-3 py-2 text-xs font-bold",
              hasError ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800",
            )}
            role="status"
          >
            {message}
          </p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1.5 text-sm font-bold text-ink">
          Tim penanggung jawab
          <input
            value={assignedTeam}
            onChange={(event) => setAssignedTeam(event.target.value)}
            disabled={!canUpdate || isPending}
            maxLength={120}
            placeholder="Contoh: Tim Bordir A"
            className="min-h-11 rounded-lg border border-line bg-white px-3 font-normal outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-ink">
          Deadline internal
          <input
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            disabled={!canUpdate || isPending}
            className="min-h-11 rounded-lg border border-line bg-white px-3 font-normal outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-ink">
          Prioritas
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as ProcessOrder["priority"])}
            disabled={!canUpdate || isPending}
            className="min-h-11 rounded-lg border border-line bg-white px-3 font-normal outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100"
          >
            <option value="low">Rendah</option>
            <option value="normal">Normal</option>
            <option value="high">Tinggi</option>
            <option value="urgent">Mendesak</option>
          </select>
        </label>
        <div className="flex items-end">
          <Button
            type="button"
            onClick={saveSettings}
            disabled={!canUpdate || isPending}
            aria-busy={isPending}
            className="min-h-11 w-full"
          >
            {isPending ? "Menyimpan..." : "Simpan pengaturan"}
          </Button>
        </div>
      </div>

      <label className="mt-4 grid gap-1.5 text-sm font-bold text-ink">
        Instruksi internal
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={!canUpdate || isPending}
          maxLength={2000}
          rows={3}
          placeholder="Catatan kerja yang perlu diketahui tim operasional..."
          className="resize-y rounded-lg border border-line bg-white px-3 py-2.5 font-normal outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100"
        />
      </label>

      <div className="mt-5 border-t border-line pt-5">
        <h3 className="font-extrabold text-ink">Kontrol proses</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {processOrder.replenishmentStatus === "needed" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                patchProcessOrder(
                  { replenishmentStatus: "in_progress", processStatus: "waiting_replenishment" },
                  "Replenishment ditandai sedang berjalan.",
                )
              }
              disabled={!canUpdate || isPending}
            >
              Mulai replenishment
            </Button>
          ) : null}
          {processOrder.replenishmentStatus === "in_progress" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                patchProcessOrder(
                  { replenishmentStatus: "completed", processStatus: "in_progress" },
                  "Replenishment ditandai selesai.",
                )
              }
              disabled={!canUpdate || isPending}
            >
              Selesaikan replenishment
            </Button>
          ) : null}
          {processOrder.processStatus !== "completed" && processOrder.processStatus !== "cancelled" ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                patchProcessOrder(
                  { processStatus: "completed" },
                  "Process order ditandai selesai.",
                )
              }
              disabled={!canUpdate || isPending || !allTasksCompleted}
            >
              Tandai process order selesai
            </Button>
          ) : null}
        </div>
        {!allTasksCompleted && processOrder.processStatus !== "completed" ? (
          <p className="mt-2 text-xs font-semibold text-ink-muted">
            Selesaikan seluruh checklist sebelum menutup process order.
          </p>
        ) : null}
        {!canUpdate ? (
          <p className="mt-2 text-xs font-semibold text-ink-muted">
            Role Anda memiliki akses lihat saja untuk pengaturan operasional.
          </p>
        ) : null}
      </div>
    </section>
  );
}
