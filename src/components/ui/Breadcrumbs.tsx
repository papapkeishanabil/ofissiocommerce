// src/components/ui/Breadcrumbs.tsx
// Reusable breadcrumb trail for orientation. Lives OUTSIDE the Ofistant
// conversational flow (which remains the main discovery path) — these are
// just signposts so users don't get lost after clicking into a detail page.

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string; // undefined = current page (no link)
}

interface BreadcrumbsProps {
  items: Crumb[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className={cn(className)}>
      <ol className="flex flex-wrap items-center gap-1 text-xs text-ink-muted">
        {items.map((c, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1">
              {c.href && !isLast ? (
                <Link
                  href={c.href}
                  className="transition-colors hover:text-brand-700"
                >
                  {c.label}
                </Link>
              ) : (
                <span
                  className={cn(isLast && "font-semibold text-ink")}
                  aria-current={isLast ? "page" : undefined}
                >
                  {c.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight className="h-3 w-3 text-ink-subtle" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
