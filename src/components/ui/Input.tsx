// src/components/ui/Input.tsx
import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-[var(--input-height,40px)] w-full rounded-[var(--control-radius,8px)] border border-line bg-surface px-3 text-sm text-ink transition-colors",
        "placeholder:text-slate-400",
        "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100",
        "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
        className,
      )}
      {...rest}
    />
  );
}
