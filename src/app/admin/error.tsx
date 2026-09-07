"use client";

import Link from "next/link";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const copy = classifyAdminError(error);
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5">
      <section className="w-full max-w-lg rounded-2xl border border-line bg-white p-8 text-center shadow-soft-md">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-600">
          {copy.eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-ink">{copy.title}</h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          {copy.description}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={reset} className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white">
            Coba lagi
          </button>
          <Link href="/login?mode=admin" className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink">
            Ganti akun
          </Link>
        </div>
      </section>
    </main>
  );
}

function classifyAdminError(error: Error) {
  const value = `${error.name} ${error.message}`.toLowerCase();
  if (value.includes("woocommerce") || value.includes("provider_unavailable")) return { eyebrow: "Provider unavailable", title: "WooCommerce sementara tidak dapat dihubungi", description: "Data tidak dianggap kosong dan tidak ada perubahan yang dijalankan. Silakan coba kembali setelah koneksi WooCommerce tersedia." };
  if (value.includes("supabase") || value.includes("database")) return { eyebrow: "Database unavailable", title: "Layanan database sementara tidak tersedia", description: "Permintaan dihentikan dengan aman. Silakan coba kembali setelah koneksi database pulih." };
  if (value.includes("network") || value.includes("fetch failed")) return { eyebrow: "Network unavailable", title: "Koneksi ke layanan eksternal terganggu", description: "Data tidak diubah. Periksa koneksi layanan kemudian coba kembali." };
  return { eyebrow: "Access forbidden", title: "Akses admin tidak tersedia", description: "Akun ini tidak memiliki permission untuk halaman tersebut. Hubungi super admin Ofissio jika akses diperlukan." };
}
