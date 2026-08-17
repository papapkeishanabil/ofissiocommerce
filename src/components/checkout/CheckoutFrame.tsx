// src/components/checkout/CheckoutFrame.tsx
// Shared frame for every checkout screen (loading, auth fallback, empty cart,
// and steps 1–3). Presentation only — it wraps whatever CheckoutPage renders
// and never touches the gating logic.

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { CheckoutSteps } from "./CheckoutSteps";

interface CheckoutFrameProps {
  /** Current step 1–3; omit on screens outside the flow (loading/auth/empty). */
  step?: number;
  title: string;
  description?: string;
  /** Sticky summary column; hidden below lg. */
  aside?: ReactNode;
  /** Narrow centered layout for message screens (no aside grid). */
  centered?: boolean;
  children: ReactNode;
}

export function CheckoutFrame({
  step,
  title,
  description,
  aside,
  centered = false,
  children,
}: CheckoutFrameProps) {
  return (
    <section
      className={cn(
        "mx-auto w-full px-4 py-8 sm:px-6 sm:py-10",
        centered ? "max-w-xl" : "max-w-6xl",
      )}
    >
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">
            {description}
          </p>
        ) : null}
      </header>

      {typeof step === "number" ? (
        <div className="mt-6 rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-soft-xs">
          <CheckoutSteps current={step} />
        </div>
      ) : null}

      {aside ? (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">{children}</div>
          <aside className="lg:sticky lg:top-24">{aside}</aside>
        </div>
      ) : (
        <div className={centered ? "mt-8" : "mt-6"}>{children}</div>
      )}
    </section>
  );
}
