import { AlertTriangle, ArrowRight, CheckCircle2, CircleDollarSign } from "lucide-react";

import { cn } from "@/lib/utils";

export interface AdminOrderNextActionState {
  tone: "warning" | "brand" | "success" | "neutral";
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

const TONES = {
  warning: {
    shell: "border-amber-200 bg-amber-50",
    icon: "bg-amber-100 text-amber-800",
    title: "text-amber-950",
    description: "text-amber-900",
    Icon: AlertTriangle,
  },
  brand: {
    shell: "border-brand-200 bg-brand-50",
    icon: "bg-brand-100 text-brand-800",
    title: "text-brand-950",
    description: "text-brand-900",
    Icon: ArrowRight,
  },
  success: {
    shell: "border-emerald-200 bg-emerald-50",
    icon: "bg-emerald-100 text-emerald-800",
    title: "text-emerald-950",
    description: "text-emerald-900",
    Icon: CheckCircle2,
  },
  neutral: {
    shell: "border-line bg-slate-50",
    icon: "bg-white text-ink-subtle",
    title: "text-ink",
    description: "text-ink-muted",
    Icon: CircleDollarSign,
  },
} as const;

export function AdminOrderNextAction({ state }: { state: AdminOrderNextActionState }) {
  const tone = TONES[state.tone];
  const Icon = tone.Icon;
  return (
    <section
      aria-labelledby="next-order-action-title"
      className={cn("rounded-2xl border px-4 py-4 shadow-soft-xs sm:px-5", tone.shell)}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", tone.icon)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="next-order-action-title" className={cn("text-base font-extrabold", tone.title)}>
              {state.title}
            </h2>
            <p className={cn("mt-1 max-w-3xl text-sm leading-6", tone.description)}>
              {state.description}
            </p>
          </div>
        </div>
        {state.actionHref && state.actionLabel ? (
          <a
            href={state.actionHref}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-800 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
          >
            {state.actionLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </section>
  );
}
