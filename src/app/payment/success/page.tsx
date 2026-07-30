import Link from "next/link";

export default function PaymentSuccessPage() {
  return (
    <main className="mx-auto grid min-h-[60vh] w-full max-w-lg place-items-center px-4 py-16 text-center">
      <div className="rounded-3xl border border-line bg-surface p-8 shadow-soft-xs">
        <p className="type-eyebrow text-emerald-700">Payment returned</p>
        <h1 className="mt-3 text-2xl font-black text-ink">
          Pembayaran sedang dicek
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          Jika pembayaran sudah berhasil di iPaymu, Ofissio akan memperbarui
          status setelah callback valid diterima.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-2xl bg-brand-900 px-5 py-3 text-sm font-black text-white"
        >
          Cek status order
        </Link>
      </div>
    </main>
  );
}
