import { AlertTriangle } from "lucide-react";

export function AdminErrorState({
  title = "Admin data belum dapat dimuat",
  description = "Silakan cek konfigurasi internal admin atau koneksi Supabase staging.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-red-800">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="mt-1 text-sm">{description}</p>
        </div>
      </div>
    </div>
  );
}
