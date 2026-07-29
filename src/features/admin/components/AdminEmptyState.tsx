import { Inbox } from "lucide-react";

export function AdminEmptyState({
  title = "Data belum tersedia",
  description = "Belum ada record untuk ditampilkan pada scope ini.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-surface p-8 text-center">
      <Inbox className="mx-auto h-9 w-9 text-slate-400" aria-hidden="true" />
      <h2 className="mt-3 text-base font-bold text-ink">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">{description}</p>
    </div>
  );
}
