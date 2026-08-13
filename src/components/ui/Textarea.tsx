// src/components/ui/Textarea.tsx
// Styled long-form input. Mirrors the Input primitive so the admin content
// editor (and future forms) can render textareas from the same @/components/ui
// set. There is no height token here — pass `rows` (or a className override)
// per field.
import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink shadow-sm transition-colors",
        "placeholder:text-slate-400",
        "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100",
        "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
        className,
      )}
      {...rest}
    />
  );
}
