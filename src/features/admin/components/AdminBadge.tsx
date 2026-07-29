import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "slate";

const TONES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  warning: "bg-amber-50 text-amber-700 ring-amber-100",
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
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ring-1",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function adminStatusTone(status: string): Tone {
  if (["accepted", "paid", "sent", "mocked", "connected", "ready"].includes(status)) {
    return "success";
  }
  if (["under_review", "quoted", "waiting_payment", "current"].includes(status)) {
    return "brand";
  }
  if (["revision_requested", "submitted", "emailed"].includes(status)) {
    return "warning";
  }
  if (["rejected", "expired", "failed", "deleted", "blocked"].includes(status)) {
    return "danger";
  }
  return "neutral";
}
