// src/components/checkout/CheckoutSteps.tsx
// Persistent step indicator for the gated checkout flow. Purely presentational:
// steps advance by data completeness (profile → address → review), never by
// clicking, so this renders state only — the gating logic stays in
// CheckoutPage's early returns.

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const STEPS = [
  { n: 1, label: "Perusahaan" },
  { n: 2, label: "Alamat" },
  { n: 3, label: "Pengiriman & Pembayaran" },
] as const;

interface CheckoutStepsProps {
  current: number;
}

export function CheckoutSteps({ current }: CheckoutStepsProps) {
  return (
    <nav aria-label="Langkah checkout">
      <ol className="flex items-center gap-3 sm:gap-4">
        {STEPS.map((step, i) => {
          const done = step.n < current;
          const active = step.n === current;
          return (
            <li key={step.n} className="flex min-w-0 items-center gap-3 sm:gap-4">
              {i > 0 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "hidden h-px w-8 shrink-0 sm:block sm:w-12",
                    done ? "bg-brand-300" : "bg-line-strong",
                  )}
                />
              ) : null}
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors",
                    active && "bg-brand-700 text-white shadow-soft-xs",
                    done && "bg-brand-50 text-brand-700 ring-1 ring-brand-200",
                    !active && !done && "bg-surface-muted text-ink-subtle ring-1 ring-line",
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : step.n}
                </span>
                <span
                  className={cn(
                    "truncate text-xs font-semibold sm:text-sm",
                    active ? "text-ink" : "text-ink-muted",
                  )}
                >
                  <span className="sr-only">
                    {done ? "Selesai: " : active ? "Langkah saat ini: " : `Langkah ${step.n}: `}
                  </span>
                  {step.label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
