import Link from "next/link";

export default function PaymentCancelPage() {
  return (
    <main className="mx-auto grid min-h-[60vh] w-full max-w-lg place-items-center px-4 py-16 text-center">
      <div className="rounded-3xl border border-line bg-surface p-8 shadow-soft-xs">
        <p className="type-eyebrow text-amber-700">Payment cancelled</p>
        <h1 className="mt-3 text-2xl font-black text-ink">
          Pembayaran belum diselesaikan
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          Kamu bisa kembali ke invoice/order untuk membuka ulang payment link
          yang masih aktif, atau hubungi tim Ofissio jika link sudah kedaluwarsa.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-2xl bg-brand-900 px-5 py-3 text-sm font-black text-white"
        >
          Lihat order saya
        </Link>
      </div>
    </main>
  );
}
