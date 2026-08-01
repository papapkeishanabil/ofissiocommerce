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
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-xl border border-line bg-white p-4 shadow-soft-sm transition hover:border-brand-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="relative">
              <p className="type-eyebrow text-ink-subtle">{card.label}</p>
              <p className="mt-1.5 text-2xl font-bold tracking-tight text-ink tabular-nums">
                {card.value}
              </p>
            </div>
            {card.icon ? (
              <span className="relative grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-700">
                {card.icon}
              </span>
            ) : null}
          </div>
          {card.helper ? (
            <p className="relative mt-2 text-xs leading-5 text-ink-muted">{card.helper}</p>
          ) : null}
        </article>
      ))}
    </section>
  );
}
