"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle, LoaderCircle, Workflow } from "lucide-react";

import type { ProcessOrder, ProcessOrderTask } from "@/features/process-orders/process-order.types";
import { processOrderStatusLabel } from "@/features/process-orders/process-order.config";
import { cn } from "@/lib/utils";

import { AdminBadge, adminStatusTone } from "./AdminBadge";
import { AdminProcessRouteBadge } from "./AdminProcessRouteBadge";
import { AdminSectionCard } from "./AdminSectionCard";

interface AdminInlineProcessChecklistProps {
  processOrder: ProcessOrder;
  tasks: ProcessOrderTask[];
  canUpdate: boolean;
  variant?: "summary" | "workbench";
}

export function AdminInlineProcessChecklist({
  processOrder,
  tasks,
  canUpdate,
  variant = "workbench",
}: AdminInlineProcessChecklistProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const orderedTasks = [...tasks].sort((left, right) => left.sortOrder - right.sortOrder);
  const activeTask = orderedTasks.find((task) => task.status !== "completed") ?? null;
  const completedCount = orderedTasks.filter((task) => task.status === "completed").length;
  const visibleTasks = variant === "summary" ? (activeTask ? [activeTask] : []) : orderedTasks;

  function completeTask(task: ProcessOrderTask) {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(
        `/api/admin/process-orders/${encodeURIComponent(processOrder.id)}/tasks/${encodeURIComponent(task.id)}/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-ofissio-internal-role": "super_admin",
            "x-ofissio-internal-user-id": "internal-dev",
          },
          body: JSON.stringify({}),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok) {
        setMessage(result.message ?? "Task belum dapat diselesaikan.");
        return;
      }
      setMessage(`${task.taskName} selesai. Progress order sudah diperbarui.`);
      router.refresh();
    });
  }

  return (
    <AdminSectionCard
      icon={Workflow}
      title={variant === "summary" ? "Progress proses" : "Checklist operasional"}
      description={`${processOrder.processOrderNumber} · ${processOrder.assignedTeam ?? "Tim belum ditentukan"}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <AdminProcessRouteBadge route={processOrder.processRoute} />
          <AdminBadge tone={adminStatusTone(processOrder.processStatus)}>
            {processOrderStatusLabel(processOrder.processStatus)}
          </AdminBadge>
        </div>
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-bold text-ink">Progress operasional</span>
            <span className="font-extrabold text-brand-800">{processOrder.progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
            <div
              className="h-full rounded-full bg-brand-700 transition-[width] duration-300"
              style={{ width: `${Math.max(0, Math.min(100, processOrder.progress))}%` }}
            />
          </div>
        </div>
        <Link
          href={
            variant === "summary"
              ? `/admin/process-orders/${encodeURIComponent(processOrder.id)}`
              : `/admin/orders/${encodeURIComponent(processOrder.ofissioOrderId)}`
          }
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-white px-3 text-xs font-bold text-brand-700 transition hover:bg-brand-50"
        >
          {variant === "summary" ? "Buka workbench proses" : "Lihat sumber order"}
        </Link>
      </div>

      {variant === "summary" ? (
        <p className="mt-4 text-xs font-semibold text-ink-muted">
          {completedCount} dari {orderedTasks.length} task selesai. Halaman Orders hanya menampilkan satu tindakan cepat.
        </p>
      ) : null}

      {visibleTasks.length > 0 ? (
      <ol className="mt-5 divide-y divide-line overflow-hidden rounded-xl border border-line">
        {visibleTasks.map((task) => {
          const index = orderedTasks.findIndex((candidate) => candidate.id === task.id);
          const completed = task.status === "completed";
          const current = activeTask?.id === task.id;
          return (
            <li
              key={task.id}
              className={cn(
                "flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
                current ? "bg-brand-50/70" : "bg-white",
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold",
                    completed
                      ? "bg-emerald-100 text-emerald-800"
                      : current
                        ? "bg-brand-700 text-white"
                        : "bg-slate-100 text-ink-subtle",
                  )}
                >
                  {completed ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
                </span>
                <div className="min-w-0">
                  <p className={cn("font-bold", completed ? "text-ink-muted line-through" : "text-ink")}>
                    {task.taskName}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {completed
                      ? "Selesai"
                      : current
                        ? "Task aktif — selesaikan untuk membuka tahap berikutnya"
                        : "Menunggu tahap sebelumnya"}
                  </p>
                </div>
              </div>
              {current && processOrder.processStatus !== "cancelled" ? (
                <button
                  type="button"
                  onClick={() => completeTask(task)}
                  disabled={!canUpdate || isPending}
                  aria-busy={isPending}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-700 px-3 text-xs font-bold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Circle className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isPending ? "Menyimpan..." : "Tandai selesai"}
                </button>
              ) : null}
            </li>
          );
        })}
      </ol>
      ) : (
        <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Seluruh task operasional telah selesai.
        </p>
      )}

      {message ? (
        <p
          className={cn(
            "mt-4 rounded-xl px-4 py-3 text-sm font-semibold",
            message.includes("belum dapat")
              ? "bg-rose-50 text-rose-800"
              : "bg-emerald-50 text-emerald-800",
          )}
          role="status"
        >
          {message}
        </p>
      ) : null}
      {!canUpdate ? (
        <p className="mt-4 text-xs font-semibold text-ink-muted">
          Role Anda memiliki akses lihat saja untuk checklist proses.
        </p>
      ) : null}
    </AdminSectionCard>
  );
}
