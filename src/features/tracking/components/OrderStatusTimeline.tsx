import { Check, Clock3, Circle, TriangleAlert } from "lucide-react";

import type { OrderTimelineStage } from "@/features/tracking/tracking.types";
import {
  stageStateLabel,
  trackingRoleLabel,
} from "@/features/tracking/tracking-utils";
import { formatTrackingDate } from "@/features/tracking/tracking.service";

interface OrderStatusTimelineProps {
  title: string;
  stages: OrderTimelineStage[];
}

export function OrderStatusTimeline({ title, stages }: OrderStatusTimelineProps) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-sm font-bold text-ink">{title}</h2>
      <ol className="mt-4 space-y-3">
        {stages.map((stage) => (
          <li key={stage.id} className="flex gap-3">
            <span className="mt-0.5 shrink-0">{iconForState(stage.state)}</span>
            <div className="min-w-0 flex-1 border-b border-line pb-3 last:border-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-ink">{stage.label}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
                  {stageStateLabel(stage.state)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-ink-muted">
                Role: {trackingRoleLabel(stage.updatedByRole)}
                {stage.completedAt ? ` - ${formatTrackingDate(stage.completedAt)}` : ""}
              </p>
              {stage.state === "current" &&
                typeof stage.completedQty === "number" &&
                typeof stage.totalQty === "number" && (
                  <p className="mt-1 text-[11px] font-semibold text-brand-700">
                    {stage.completedQty} dari {stage.totalQty} pcs selesai di tahap ini
                  </p>
                )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function iconForState(state: OrderTimelineStage["state"]) {
  switch (state) {
    case "completed":
      return (
        <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
          <Check className="h-3.5 w-3.5" />
        </span>
      );
    case "current":
      return (
        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100">
          <Clock3 className="h-3.5 w-3.5" />
        </span>
      );
    case "blocked":
      return (
        <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-100">
          <TriangleAlert className="h-3.5 w-3.5" />
        </span>
      );
    case "pending":
      return (
        <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-200">
          <Circle className="h-3 w-3" />
        </span>
      );
  }
}
