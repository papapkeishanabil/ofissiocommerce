// src/components/home/WhyOfissio.tsx
// Bold brand-forward value props. Monochrome icon treatment, big type,
// editorial card layout. No rainbow gradients.

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
    desc: "Ketersediaan stok konsisten memudahkan perencanaan pengadaan seragam Anda sepanjang tahun.",
  },
  {
    icon: Scissors,
    title: "Siap Bordir Logo",
    desc: "Fasilitas bordir in-house memastikan logo perusahaan diaplikasikan dengan presisi tinggi.",
  },
  {
    icon: Users,
    title: "MOQ Kecil",
    desc: "Melayani seragam dalam jumlah kecil mulai 8 pcs — untuk tim yang dinamis.",
  },
  {
    icon: Ruler,
    title: "Ukuran S–3XL",
    desc: "Pilihan ukuran lengkap memastikan setiap anggota tim mendapatkan ukuran yang pas.",
  },
  {
    icon: Bolt,
    title: "Proses Cepat",
    desc: "Dari pemilihan hingga pengiriman, alur kerja didesain untuk efisiensi waktu perusahaan.",
  },
  {
    icon: RotateCcw,
    title: "Repeat Order Mudah",
    desc: "Data logo dan spesifikasi pesanan tersimpan rapi untuk pemesanan ulang yang instan.",
  },
];

export function WhyOfissio() {
  return (
    <section className="bg-surface py-20 lg:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 lg:px-8">
        {/* editorial header — left aligned, big */}
        <div className="max-w-3xl">
          <span className="type-eyebrow text-brand-600">
            <span className="mr-2 inline-block h-px w-8 bg-brand-600 align-middle" />
            Mengapa Ofissio
          </span>
          <h2
            className="type-display mt-5 text-ink-strong"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}
          >
            Procurement yang
            <br />
            <span className="text-brand-600">bisa diandalkan.</span>
          </h2>
          <p className="mt-4 max-w-xl text-base text-ink-muted lg:text-lg">
            Solusi pengadaan seragam yang praktis, cepat, dan berkualitas untuk
            seluruh industri.
          </p>
        </div>

        {/* value props grid */}
        <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((x, i) => (
            <div
              key={x.title}
              className="group relative bg-surface p-8 transition-colors duration-300 hover:bg-brand-700"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-xl border border-line text-brand-700 transition-all duration-300 group-hover:border-white/30 group-hover:text-ochre-400">
                  <x.icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="type-mono-label text-ink-subtle transition-colors group-hover:text-brand-200">
                  {String(i + 1).padStart(2, "0")} /
                </span>
              </div>
              <h3
                className="type-display mt-6 text-xl text-ink-strong transition-colors group-hover:text-white"
                style={{ fontWeight: 600 }}
              >
                {x.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted transition-colors group-hover:text-brand-100">
                {x.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
