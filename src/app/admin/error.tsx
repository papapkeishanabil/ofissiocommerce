"use client";

import Link from "next/link";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5">
      <section className="w-full max-w-lg rounded-2xl border border-line bg-white p-8 text-center shadow-soft-md">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-600">
          Access forbidden
        </p>
        <h1 className="mt-2 text-2xl font-bold text-ink">Akses admin tidak tersedia</h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          Akun ini tidak memiliki permission untuk halaman tersebut. Hubungi super admin Ofissio jika akses diperlukan.
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
