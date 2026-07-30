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
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {cards.map((card) => (
        <article
          key={card.label}
          className="group relative overflow-hidden rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03] transition duration-300 hover:-translate-y-1 hover:shadow-soft-lg"
        >
          <div
            aria-hidden="true"
            className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-brand-100/80 blur-2xl transition group-hover:bg-brand-200/80"
          />
          <div className="flex items-start justify-between gap-3">
            <div className="relative">
              <p className="type-eyebrow text-ink-subtle">{card.label}</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-ink">
                {card.value}
              </p>
            </div>
            {card.icon ? (
              <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-brand-700 text-white shadow-glow-brand">
                {card.icon}
              </span>
            ) : null}
          </div>
          {card.helper ? (
            <p className="relative mt-3 text-sm leading-6 text-ink-muted">{card.helper}</p>
          ) : null}
        </article>
      ))}
    </section>
  );
}
