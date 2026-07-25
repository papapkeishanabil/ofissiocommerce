// src/components/home/WhyOfissio.tsx
// 6 value-prop cards — B2B procurement reliability messaging.
// Adapted from the Ofissio Workwear homepage reference.

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
  },
  {
    icon: Scissors,
    title: "Siap Bordir Logo",
    desc: "Fasilitas in-house embroidery memastikan logo perusahaan Anda diaplikasikan dengan presisi tinggi.",
  },
  {
    icon: Users,
    title: "MOQ Kecil",
    desc: "Melayani kebutuhan seragam dalam jumlah kecil mulai dari 8 pcs untuk tim yang dinamis.",
  },
  {
    icon: Ruler,
    title: "Ukuran S–3XL",
    desc: "Pilihan ukuran lengkap memastikan setiap anggota tim mendapatkan ukuran yang pas.",
  },
  {
    icon: Bolt,
    title: "Proses Cepat",
    desc: "Dari pemilihan hingga pengiriman, seluruh alur kerja didesain untuk efisiensi waktu perusahaan.",
  },
  {
    icon: RotateCcw,
    title: "Repeat Order Mudah",
    desc: "Data logo dan spesifikasi pesanan tersimpan rapi untuk pemesanan ulang yang instan.",
  },
];

export function WhyOfissio() {
  return (
    <section className="bg-cool-100 py-14 lg:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300">
            Mengapa Ofissio
          </span>
          <h2 className="font-display mt-2 text-2xl font-extrabold text-ink-strong lg:text-3xl">
            Procurement yang bisa diandalkan.
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Solusi pengadaan seragam yang praktis, cepat, dan berkualitas untuk
            seluruh industri.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((x) => (
            <div
              key={x.title}
              className="rounded-2xl border border-line bg-surface p-6 shadow-soft-xs transition hover:-translate-y-0.5 hover:shadow-soft-md"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <x.icon className="h-5 w-5" />
              </span>
              <h3 className="font-display mt-4 text-base font-bold text-ink-strong">
                {x.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                {x.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
