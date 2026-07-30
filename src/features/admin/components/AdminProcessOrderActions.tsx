"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import type {
  ProcessOrderStatus,
  ProcessReplenishmentStatus,
  ProcessOrderTask,
} from "@/features/process-orders/process-order.types";

interface AdminProcessOrderActionsProps {
  processOrderId: string;
  processStatus: ProcessOrderStatus;
  replenishmentStatus: ProcessReplenishmentStatus;
  tasks: ProcessOrderTask[];
}

export function AdminProcessOrderActions({
  processOrderId,
  processStatus,
  replenishmentStatus,
  tasks,
}: AdminProcessOrderActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const firstActionableTask = tasks.find((task) => task.status !== "completed");

  function completeTask(taskId: string) {
    runAction(async () => {
      const response = await fetch(
        `/api/admin/process-orders/${processOrderId}/tasks/${taskId}/complete`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-ofissio-internal-role": "super_admin",
            "x-ofissio-internal-user-id": "internal-dev",
          },
          body: JSON.stringify({}),
        },
      );
      return response;
    }, "Task selesai dan tracking customer diperbarui.");
  }

  function patchProcessOrder(
    patch: Partial<{
      processStatus: ProcessOrderStatus;
      replenishmentStatus: ProcessReplenishmentStatus;
    }>,
    successMessage: string,
  ) {
    runAction(async () => {
      const response = await fetch(`/api/admin/process-orders/${processOrderId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-ofissio-internal-role": "super_admin",
          "x-ofissio-internal-user-id": "internal-dev",
        },
        body: JSON.stringify(patch),
      });
      return response;
    }, successMessage);
  }

  function runAction(action: () => Promise<Response>, successMessage: string) {
    setMessage(null);
    startTransition(async () => {
      const response = await action();
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok) {
        setMessage(result.message ?? "Aksi process order belum berhasil.");
        return;
      }
      setMessage(successMessage);
      router.refresh();
    });
  }

  return (
    <section className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
            Process actions
          </p>
          <h3 className="mt-1 text-lg font-black text-ink">Update foundation</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Aksi ini internal admin only. Customer hanya melihat label tracking yang disederhanakan.
          </p>
        </div>
        {message ? (
          <p className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-ink" role="status">
            {message}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {firstActionableTask ? (
          <Button
            type="button"
            size="sm"
            onClick={() => completeTask(firstActionableTask.id)}
            disabled={isPending || processStatus === "completed" || processStatus === "cancelled"}
            aria-busy={isPending}
          >
            Complete: {firstActionableTask.taskName}
          </Button>
        ) : null}
        {replenishmentStatus === "needed" ? (
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
            disabled={isPending}
          >
            Mark replenishment in progress
          </Button>
        ) : null}
        {replenishmentStatus === "in_progress" ? (
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
            disabled={isPending}
          >
            Mark replenishment completed
          </Button>
        ) : null}
        {processStatus !== "completed" && processStatus !== "cancelled" ? (
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
            disabled={isPending}
          >
            Mark process completed
          </Button>
        ) : null}
      </div>
    </section>
  );
}
