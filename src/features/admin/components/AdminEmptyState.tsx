import { Inbox } from "lucide-react";

export function AdminEmptyState({
  title = "Data belum tersedia",
  description = "Belum ada record untuk ditampilkan pada scope ini.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/50 p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-white text-brand-700 shadow-soft-sm">
        <Inbox className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="mt-3 text-base font-semibold text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">{description}</p>
    </div>
  );
}
