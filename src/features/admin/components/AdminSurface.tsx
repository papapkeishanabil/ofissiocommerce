import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/[0.85] p-5 shadow-soft-md ring-1 ring-slate-950/[0.03] backdrop-blur md:p-7",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-brand-100/70 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 left-10 h-52 w-52 rounded-full bg-ochre-100/60 blur-3xl"
      />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="type-eyebrow text-brand-700">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-ink md:text-4xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted md:text-base">
              {description}
            </p>
          ) : null}
          {children ? <div className="mt-5">{children}</div> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </section>
  );
}

export function AdminCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-sm ring-1 ring-slate-950/[0.03] backdrop-blur",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function AdminPanel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AdminCard className={className}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-black tracking-tight text-ink">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-ink-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </AdminCard>
  );
}

export function AdminTableShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[1.75rem] border border-white/75 bg-white/90 shadow-soft-md ring-1 ring-slate-950/[0.03]",
        className,
      )}
    >
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function AdminBackLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-white/90 px-4 py-2 text-sm font-black text-brand-700 shadow-soft-xs transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {children}
    </Link>
  );
}

export const ADMIN_TABLE_CLASS =
  "w-full text-left text-sm [&_tbody]:divide-y [&_tbody]:divide-line/80 [&_tbody_tr]:transition [&_tbody_tr:hover]:bg-brand-50/40 [&_th]:whitespace-nowrap [&_th]:px-4 [&_th]:py-4 [&_th]:text-left [&_th]:text-[11px] [&_th]:font-black [&_th]:uppercase [&_th]:tracking-[0.18em] [&_th]:text-ink-subtle [&_td]:px-4 [&_td]:py-4";
