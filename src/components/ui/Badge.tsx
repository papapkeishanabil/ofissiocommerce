// src/components/ui/Badge.tsx
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "success" | "warning" | "amber" | "slate";

const TONES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  brand: "bg-brand-50 text-brand-700 ring-1 ring-brand-100",
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  warning: "bg-red-50 text-red-700 ring-1 ring-red-100",
  amber: "bg-ochre-50 text-ochre-700 ring-1 ring-ochre-100",
  slate: "bg-ink text-white",
};

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
