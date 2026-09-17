// src/components/checkout/CheckoutFrame.tsx
// Shared frame for every checkout screen (loading, auth fallback, empty cart,
// and steps 1-3). Presentation only — it wraps whatever CheckoutPage renders
// and never touches the gating logic.

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { CheckoutSteps } from "./CheckoutSteps";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Check } from "lucide-react";

interface CheckoutFrameProps {
  /** Current step 1-3; omit on screens outside the flow (loading/auth/empty). */
  step?: number;
  title: string;
  description?: string;
  /** Sticky summary column; hidden below lg. */
  aside?: ReactNode;
  /** Narrow centered layout for message screens (no aside grid). */
  centered?: boolean;
  children: ReactNode;
  checkout?: boolean;
  footer?: ReactNode;
}

export function CheckoutFrame({
  step,
  title,
  description,
  aside,
  centered = false,
  children,
  checkout = false,
  footer,
}: CheckoutFrameProps) {
  return (
    <section
      className={cn(
        checkout ? "mx-auto flex min-h-[calc(100dvh-56px)] w-full flex-col px-4 lg:px-8" : "mx-auto w-full px-4 py-8 sm:px-6 sm:py-10",
        centered ? "max-w-xl" : "max-w-[1680px]",
      )}
    >
      {checkout && <div className="commerce-breadcrumb-row flex flex-wrap items-center justify-between gap-3"><Breadcrumbs items={[{label:"Beranda",href:"/"},{label:"Keranjang",href:"/cart"},{label:"Checkout"}]} /><ol aria-label="Tahapan belanja" className="flex items-center gap-3 text-xs text-ink-muted">{["Produk","Keranjang","Checkout"].map((label,i)=><li key={label} aria-current={i===2?"step":undefined} className="flex items-center gap-2">{i>0 && <span className="h-px w-5 bg-ochre-200 sm:w-12" />}<span className="grid h-5 w-5 place-items-center rounded-full bg-ochre-600 text-white">{i<2?<Check className="h-3 w-3"/>:3}</span><span className={i===2?"font-semibold text-ink":""}>{label}</span></li>)}</ol></div>}
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">
            {description}
          </p>
        ) : null}
      </header>

      {typeof step === "number" && !checkout ? (
        <div className="mt-6 border-b border-line pb-5">
          <CheckoutSteps current={step} />
        </div>
      ) : null}

      {aside ? (
        <div className={checkout ? "mb-5 mt-4 grid items-start gap-4 lg:grid-cols-[1.05fr_1fr]" : "mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]"}>
          <div className="min-w-0">{children}</div>
          <aside className="lg:sticky lg:top-24">{aside}</aside>
        </div>
      ) : (
        <div className={centered ? "mt-8" : "mt-6"}>{children}</div>
      )}
      {footer && <footer className="sticky bottom-0 z-20 -mx-4 mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3 lg:-mx-8 lg:px-8">{footer}</footer>}
    </section>
  );
}
