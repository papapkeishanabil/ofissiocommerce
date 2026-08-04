import Link from "next/link";
import { ArrowRight, Factory, PackageCheck } from "lucide-react";

const PATHS = [
  {
    title: "Produk katalog",
    description:
      "Pilih produk yang sudah tersedia, tentukan jumlah dan ukuran, lalu tambahkan bordir bila diperlukan.",
    detail: "Cocok untuk Fulfillment atau Customization",
    href: "/catalog",
    action: "Pilih produk",
    Icon: PackageCheck,
    tone: "brand",
  },
  {
    title: "Seragam Full Custom",
    description:
      "Gunakan desain, model, bahan, pola, warna, atau size chart perusahaan sendiri tanpa memilih produk dahulu.",
    detail: "Masuk ke Production Order / SPK",
    href: "/custom-request",
    action: "Buat brief Full Custom",
    Icon: Factory,
    tone: "ochre",
  },
] as const;

export function QuoteForm() {
  return (
    <section className="rounded-3xl border border-line bg-white p-5 shadow-soft-md sm:p-7">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-700">
        Pilih cara memulai
      </p>
      <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-strong">
        Kebutuhan Anda masuk jalur yang tepat sejak awal.
      </h3>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        Tidak perlu mengisi formulir umum. Pilih jalur sesuai kebutuhan agar tim Ofissio
        menerima data yang lengkap dan dapat menyiapkan quotation dengan lebih cepat.
      </p>

      <div className="mt-6 space-y-3">
        {PATHS.map(({ Icon, ...path }) => (
          <Link
            key={path.href}
            href={path.href}
            className={`group flex min-h-36 items-start gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-soft-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
              path.tone === "ochre"
                ? "border-ochre-200 bg-ochre-50/60 hover:border-ochre-400"
                : "border-brand-200 bg-brand-50/60 hover:border-brand-400"
            }`}
          >
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                path.tone === "ochre"
                  ? "bg-ochre-400 text-brand-950"
                  : "bg-brand-800 text-white"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-extrabold text-ink">{path.title}</span>
              <span className="mt-1 block text-sm leading-6 text-ink-muted">
                {path.description}
              </span>
              <span className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                <span className="text-ink-muted">{path.detail}</span>
                <span className="inline-flex items-center gap-1 text-brand-700">
                  {path.action}
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
