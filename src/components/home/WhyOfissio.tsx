import { Bolt, Boxes, Ruler, RotateCcw, Scissors, Users } from "lucide-react";

const ITEMS = [
  { icon: Boxes, title: "Stok Reliable", desc: "Ketersediaan stok konsisten memudahkan perencanaan pengadaan seragam sepanjang tahun." },
  { icon: Scissors, title: "Siap Bordir Logo", desc: "Fasilitas bordir in-house memastikan logo perusahaan diaplikasikan dengan presisi tinggi." },
  { icon: Users, title: "MOQ Kecil", desc: "Melayani seragam dalam jumlah kecil mulai 8 pcs — untuk tim yang dinamis." },
  { icon: Ruler, title: "Ukuran S–3XL", desc: "Pilihan ukuran lengkap memastikan setiap anggota tim mendapatkan ukuran yang pas." },
  { icon: Bolt, title: "Proses Cepat", desc: "Dari pemilihan hingga pengiriman, alur kerja didesain untuk efisiensi waktu perusahaan." },
  { icon: RotateCcw, title: "Repeat Order Mudah", desc: "Data logo dan spesifikasi pesanan tersimpan rapi untuk pemesanan ulang yang instan." },
];

export function WhyOfissio() {
  return (
    <section className="relative overflow-hidden bg-[#070d1c] py-20 lg:py-24">
      <video autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover opacity-80">
        <source src="/KK-006.mp4" type="video/mp4" />
      </video>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[#070d1c]/25" />
      {/* Gradient fade top → smooth transition from previous section */}
      <div aria-hidden className="pointer-events-none absolute top-0 left-0 right-0 z-[1] h-[140px]" style={{ background: "linear-gradient(to top, transparent, #070d1c)" }} />
      {/* Gradient fade bottom */}
      <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 right-0 z-[1] h-[100px]" style={{ background: "linear-gradient(to bottom, transparent, #070d1c)" }} />

      <div className="relative z-10 mx-auto max-w-7xl px-4 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-sky-200">
            Mengapa Ofissio
          </span>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl lg:text-5xl" style={{ textShadow: "0 2px 20px rgba(0,0,0,.4)" }}>
            Procurement yang <span className="text-sky-300">bisa diandalkan.</span>
          </h2>
        </div>

        {/* 6 glass cards — all visible at once */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/12 bg-white/[0.05] p-6 backdrop-blur-md transition-all duration-300 hover:border-sky-300/30 hover:bg-white/[0.08]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-sky-300/20 bg-sky-300/10 text-sky-300">
                <item.icon className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <h3 className="mt-4 text-base font-bold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
