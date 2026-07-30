import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "slate";

const TONES: Record<Tone, string> = {
  neutral: "bg-slate-100/90 text-slate-700 ring-slate-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  warning: "bg-amber-50 text-amber-800 ring-amber-100",
  danger: "bg-red-50 text-red-700 ring-red-100",
  slate: "bg-ink text-white ring-ink",
};

export function AdminBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ring-1",
        TONES[tone],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {children}
    </span>
  );
}

export function adminStatusTone(status: string): Tone {
  if (
    [
      "accepted",
      "converted_to_order",
      "paid",
      "sent",
      "mocked",
      "connected",
      "ready",
      "synced",
      "completed",
      "not_required",
    ].includes(status)
  ) {
    return "success";
  }
  if (
    [
      "under_review",
      "quoted",
      "waiting_payment",
      "current",
      "pending",
      "ready_to_process",
      "in_progress",
      "fulfillment",
      "customization",
      "normal",
    ].includes(status)
  ) {
    return "brand";
  }
  if (
    [
      "revision_requested",
      "submitted",
      "emailed",
      "waiting_replenishment",
      "waiting_customer_approval",
      "on_hold",
      "needed",
      "production",
      "high",
      "urgent",
    ].includes(status)
  ) {
    return "warning";
  }
  if (["rejected", "expired", "cancelled", "failed", "deleted", "blocked"].includes(status)) {
    return "danger";
  }
  return "neutral";
}
