// src/components/home/WhyOfissio.tsx
// 6 value-prop cards with gradient icon tiles, numbered, hover lift.

import {
  Bolt,
  Boxes,
  Ruler,
  RotateCcw,
  Scissors,
  Users,
} from "lucide-react";

const ITEMS = [
  {
    icon: Boxes,
    title: "Stok Reliable",
    desc: "Ketersediaan stok yang konsisten memudahkan perencanaan pengadaan seragam Anda.",
    accent: "from-brand-500 to-brand-700",
  },
  {
    icon: Scissors,
    title: "Siap Bordir Logo",
    desc: "Fasilitas in-house embroidery memastikan logo perusahaan Anda diaplikasikan dengan presisi tinggi.",
    accent: "from-ochre-500 to-ochre-600",
  },
  {
    icon: Users,
    title: "MOQ Kecil",
    desc: "Melayani kebutuhan seragam dalam jumlah kecil mulai dari 8 pcs untuk tim yang dinamis.",
    accent: "from-emerald-500 to-emerald-700",
  },
  {
    icon: Ruler,
    title: "Ukuran S–3XL",
    desc: "Pilihan ukuran lengkap memastikan setiap anggota tim mendapatkan ukuran yang pas.",
    accent: "from-sky-500 to-sky-700",
  },
  {
    icon: Bolt,
    title: "Proses Cepat",
    desc: "Dari pemilihan hingga pengiriman, seluruh alur kerja didesain untuk efisiensi waktu perusahaan.",
    accent: "from-violet-500 to-violet-700",
  },
  {
    icon: RotateCcw,
    title: "Repeat Order Mudah",
    desc: "Data logo dan spesifikasi pesanan tersimpan rapi untuk pemesanan ulang yang instan.",
    accent: "from-rose-500 to-rose-700",
  },
];

export function WhyOfissio() {
  return (
    <section className="relative overflow-hidden bg-cool-100 py-16 lg:py-24">
      {/* soft background orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-10 h-64 w-64 rounded-full bg-brand-200/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-10 h-72 w-72 rounded-full bg-ochre-100/40 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600 shadow-soft-xs">
            Mengapa Ofissio
          </span>
          <h2
            className="font-display mt-4 font-extrabold tracking-tight text-ink-strong"
            style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)" }}
          >
            Procurement yang bisa{" "}
            <span className="text-gradient-brand">diandalkan.</span>
          </h2>
          <p className="mt-3 text-sm text-ink-muted lg:text-base">
            Solusi pengadaan seragam yang praktis, cepat, dan berkualitas untuk
            seluruh industri.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((x, i) => (
            <div
              key={x.title}
              className="hover-lift group relative overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-soft-sm hover:shadow-soft-lg"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* hover sheen */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-50/0 to-brand-50/0 opacity-0 transition-opacity duration-300 group-hover:from-brand-50/60 group-hover:to-transparent group-hover:opacity-100"
              />
              {/* number watermark */}
              <span
                aria-hidden
                className="font-display pointer-events-none absolute -right-2 -top-3 text-6xl font-extrabold text-brand-50 transition-colors group-hover:text-brand-100"
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="relative">
                <span
                  className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${x.accent} text-white shadow-soft-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}
                >
                  <x.icon className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <h3 className="font-display mt-4 text-base font-bold text-ink-strong">
                  {x.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                  {x.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
