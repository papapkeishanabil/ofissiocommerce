import { Inbox } from "lucide-react";

export function AdminEmptyState({
  title = "Data belum tersedia",
  description = "Belum ada record untuk ditampilkan pada scope ini.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-brand-200/80 bg-brand-50/[0.55] p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-brand-700 shadow-soft-sm">
        <Inbox className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-black text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">{description}</p>
    </div>
  );
}
