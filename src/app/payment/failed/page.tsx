import Link from "next/link";

export default function PaymentFailedPage() {
  return (
    <main className="mx-auto grid min-h-[60vh] w-full max-w-lg place-items-center px-4 py-16 text-center">
      <div className="rounded-3xl border border-line bg-surface p-8 shadow-soft-xs">
        <p className="type-eyebrow text-red-700">Payment failed</p>
        <h1 className="mt-3 text-2xl font-black text-ink">
          Pembayaran belum berhasil
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          Silakan coba payment link yang masih aktif di invoice/order, atau
          minta tim Ofissio membuat link pembayaran baru.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-2xl bg-brand-900 px-5 py-3 text-sm font-black text-white"
        >
          Kembali ke dashboard
        </Link>
      </div>
    </main>
  );
}
