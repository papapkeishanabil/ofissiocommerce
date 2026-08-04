import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionTone = "brand" | "neutral" | "ochre" | "emerald";

const TONE_CHIP: Record<SectionTone, string> = {
  brand: "bg-brand-50 text-brand-700",
  neutral: "bg-slate-100 text-ink-subtle",
  ochre: "bg-ochre-50 text-ochre-700",
  emerald: "bg-emerald-50 text-emerald-700",
};

interface AdminSectionCardProps {
  icon?: LucideIcon;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  tone?: SectionTone;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

/**
 * Consistent admin detail section: an icon-chip + title header strip on a
 * white card, so data-heavy pages read as a clear sequence of sections instead
 * of a wall of identical cards.
 */
export function AdminSectionCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
  tone = "brand",
  className,
  bodyClassName,
  children,
}: AdminSectionCardProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-3xl border border-line bg-white shadow-soft-sm",
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-gradient-to-r from-slate-50/80 to-transparent px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <span
              className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                TONE_CHIP[tone],
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : null}
          <div className="min-w-0">
            {eyebrow ? (
              <p className="type-eyebrow text-ink-subtle">{eyebrow}</p>
            ) : null}
            <h3 className="text-base font-extrabold tracking-tight text-ink">
              {title}
            </h3>
            {description ? (
              <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
