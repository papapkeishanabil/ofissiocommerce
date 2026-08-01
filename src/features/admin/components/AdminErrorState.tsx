import { AlertTriangle } from "lucide-react";

export function AdminErrorState({
  title = "Admin data belum dapat dimuat",
  description = "Silakan cek konfigurasi internal admin atau koneksi Supabase staging.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-red-100 bg-red-50/90 p-5 text-red-800 shadow-soft-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-red-700 shadow-soft-xs">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-black">{title}</h2>
          <p className="mt-1 text-sm leading-6">{description}</p>
        </div>
      </div>
    </div>
  );
}
