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
          className="rounded-3xl border border-line bg-surface p-5 shadow-soft-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-muted">
                {card.label}
              </p>
              <p className="mt-2 text-3xl font-black tracking-tight text-ink">
                {card.value}
              </p>
            </div>
            {card.icon ? (
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                {card.icon}
              </span>
            ) : null}
          </div>
          {card.helper ? (
            <p className="mt-3 text-sm text-ink-muted">{card.helper}</p>
          ) : null}
        </article>
      ))}
    </section>
  );
}
