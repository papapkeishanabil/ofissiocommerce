import { Check, Circle, TriangleAlert } from "lucide-react";

import { formatTrackingDate } from "@/features/tracking/tracking.service";
import type { OrderTimelineStage } from "@/features/tracking/tracking.types";
import { stageStateLabel } from "@/features/tracking/tracking-utils";

interface OrderStageStepperProps {
  stages: OrderTimelineStage[];
}

// Node stepper — ringkasan visual tahapan order agar customer langsung
// melihat mana yang sudah terlewati, sedang berjalan, dan belum mulai.
// Node terisi navy = selesai, cincin navy = berjalan, amber = butuh aksi,
// redup = menunggu. Tata letak vertikal di layar kecil, horizontal di sm+.
export function OrderStageStepper({ stages }: OrderStageStepperProps) {
  if (stages.length === 0) return null;
  const currentIndex = stages.findIndex((stage) => stage.state === "current");

  return (
    <section
      className="rounded-2xl border border-white/70 bg-white/65 p-5 shadow-soft-md backdrop-blur-xl"
      aria-label="Ringkasan tahapan order"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-ink-strong">Tahapan order</h2>
        <p className="text-xs font-semibold text-ink-muted">
          {currentIndex >= 0
            ? `Tahap ${currentIndex + 1} dari ${stages.length}: ${stageStateLabel("current")}`
            : stages.every((stage) => stage.state === "completed")
              ? `Semua ${stages.length} tahap selesai`
              : `${stages.length} tahap`}
        </p>
      </div>

      <ol className="mt-5 flex flex-col sm:flex-row">
        {stages.map((stage, index) => {
          const next = stages[index + 1];
          // Segmen menuju node berikutnya dianggap "terlewati" begitu tahap
          // tersebut tersentuh (completed / current / blocked), bukan hanya
          // setelah selesai.
          const segmentReached = Boolean(next && next.state !== "pending");
          return (
            <li
              key={stage.id}
              className="relative flex items-start gap-3 pb-6 last:pb-0 sm:flex-1 sm:flex-col sm:items-center sm:gap-0 sm:pb-0 sm:text-center"
            >
              {next && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-[2px] rounded-full sm:left-1/2 sm:top-[15px] sm:h-[2px] sm:w-full ${
                    segmentReached ? "bg-brand-600" : "bg-white/70"
                  }`}
                />
              )}
              <StageNode state={stage.state} />
              <div className="min-w-0 flex-1 sm:mt-2.5 sm:w-full sm:px-1">
                <p
                  className={`text-xs font-semibold leading-snug ${
                    stage.state === "current"
                      ? "text-brand-700"
                      : stage.state === "pending"
                        ? "text-ink-muted"
                        : "text-ink-strong"
                  }`}
                >
                  {stage.label}
                </p>
                <p className="mt-0.5 text-[10px] text-ink-subtle">
                  {stage.state === "completed" && stage.completedAt
                    ? formatTrackingDate(stage.completedAt)
                    : stageStateLabel(stage.state)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function StageNode({ state }: { state: OrderTimelineStage["state"] }) {
  switch (state) {
    case "completed":
      return (
        <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-700 text-white shadow-soft-sm">
          <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
        </span>
      );
    case "current":
      return (
        <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white ring-2 ring-brand-600">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-600" aria-hidden="true" />
        </span>
      );
    case "blocked":
      return (
        <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-300">
          <TriangleAlert className="h-4 w-4" aria-hidden="true" />
        </span>
      );
    case "pending":
      return (
        <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cool-100 text-ink-subtle">
          <Circle className="h-3 w-3" aria-hidden="true" />
        </span>
      );
  }
}
