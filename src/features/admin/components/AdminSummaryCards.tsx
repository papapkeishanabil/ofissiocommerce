import type { ReactNode } from "react";

export function AdminSummaryCards({
  cards,
}: {
  cards: Array<{
    label: string;
    value: string | number;
    helper?: string;
    icon?: ReactNode;
  }>;
}) {
  return (
    <section
      aria-label="Ringkasan admin"
      className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4"
    >
      {cards.map((card) => (
        <article
          key={card.label}
          className="group rounded-xl bg-white p-4 shadow-[0_7px_22px_rgba(24,36,59,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(24,36,59,0.1)] first:bg-gradient-to-br first:from-brand-900 first:to-brand-700 first:text-white"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="relative">
              <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-subtle group-first:text-blue-100/70">{card.label}</p>
              <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-ink tabular-nums group-first:text-white">
                {card.value}
              </p>
            </div>
            {card.icon ? (
              <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700 group-first:bg-white/10 group-first:text-white">
                {card.icon}
              </span>
            ) : null}
          </div>
          {card.helper ? (
            <p className="relative mt-2 text-[11px] leading-5 text-ink-muted group-first:text-blue-100/70">{card.helper}</p>
          ) : null}
        </article>
      ))}
    </section>
  );
}
