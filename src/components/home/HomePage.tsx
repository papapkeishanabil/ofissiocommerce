import Link from "next/link";
import {
  ArrowRight, Award, Bolt, Building2, Boxes, Clock,
  PackageCheck, RotateCcw, Ruler, Scissors, ShieldCheck,
  Sparkles, Truck, Users, type LucideIcon,
} from "lucide-react";

import { HeroIntro } from "./HeroIntro";
import { ProductCategory3DWrapper } from "./ProductCategory3DWrapper";
import { QuoteForm } from "./QuoteForm";
import { ScrollRevealInit } from "./ScrollRevealInit";
import { INDUSTRY_META } from "@/data/industries";

const STATS = [
  { icon: Scissors, value: "12.000+", label: "Logo bordir / bulan" },
  { icon: Building2, value: "340+", label: "Perusahaan klien" },
  { icon: PackageCheck, value: "8 pcs", label: "Minimum order" },
  { icon: Clock, value: "48 jam", label: "Lead time cepat" },
];

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "Brand Sendiri" },
  { icon: Scissors, label: "100% Produksi In-House" },
  { icon: Truck, label: "34 Provinsi Terjangkau" },
  { icon: RotateCcw, label: "20–2.000+ pcs/order" },
];

const ADVANTAGES = [
  { icon: Award, title: "Merek Sendiri", desc: "Pola, kain, dan standar jahit dikembangkan sendiri sejak 2016 — bukan white-label dari pihak lain." },
  { icon: Scissors, title: "Bordir In-House", desc: "Mesin bordir komputer multi-kepala untuk presisi tinggi, konsisten di setiap batch reorder." },
  { icon: Users, title: "Konsultan Dedicated", desc: "Satu tim yang sama menangani perusahaan Anda dari sampel awal sampai reorder tahunan." },
  { icon: Building2, title: "Skala Nasional", desc: "Kapasitas 20 hingga 5.000+ seragam per pemesanan, 34 provinsi terjangkau." },
  { icon: ShieldCheck, title: "QC Berlapis", desc: "Uji kain → uji jahit → uji ketahanan bordir sebelum dikirim ke perusahaan Anda." },
  { icon: Bolt, title: "Dokumentasi Produksi", desc: "Video proses produksi tersedia atas permintaan dan lihat seragam tim Anda dijahit." },
];

const CAPABILITIES = [
  { title: "Mesin Multi-Kepala", desc: "Presisi tinggi, gradasi warna & detail kecil." },
  { title: "Dokumentasi Video", desc: "Lihat seragam Anda dijahit atas permintaan." },
  { title: "QC Berlapis", desc: "Uji kain → jahit → ketahanan bordir." },
  { title: "Design Preview", desc: "Revisi gratis sebelum mesin berjalan." },
];

type Category = {
  title: string; desc: string; tag: string; href: string;
  glb?: string; icon?: LucideIcon;
};

const CATEGORIES: Category[] = [
  { title: "Kemeja & Polo", desc: "Oxford, twill, polo untuk corporate, manufaktur, dan hospitality.", tag: "Slim · Regular", href: "/catalog?category=kemeja", glb: "/3d/kk-006-mini.glb" },
  { title: "Wearpack & Coverall", desc: "Tahan abrasi untuk lapangan, proyek konstruksi, dan pertambangan.", tag: "Safety Grade", href: "/catalog?category=wearpack", glb: "/3d/kk-012-mini.glb" },
  { title: "Safety Wear", desc: "APD dan perlindungan sesuai standar keselamatan kerja.", tag: "Safety Grade", href: "/catalog?category=safety", glb: "/3d/ks-002-mini.glb" },
  { title: "Jaket & Outerwear", desc: "Windbreaker, fleece, jaket bordir untuk tim lapangan.", tag: "Windbreaker · Fleece", href: "/catalog?category=jaket", icon: ShieldCheck },
  { title: "Topi & Aksesoris", desc: "Topi bordir, lanyard, name tag — pelengkap identitas tim.", tag: "Bordir Timbul", href: "/catalog?category=topi", icon: Award },
  { title: "Scrubs & Medis", desc: "Jas medis antimikroba untuk klinik dan rumah sakit.", tag: "Antimikroba", href: "/catalog?category=medis", icon: Users },
];

const STEPS = [
  { n: "01", title: "Pilih Produk", desc: "Browse katalog ready stock dan pilih produk yang sesuai kebutuhan tim Anda." },
  { n: "02", title: "Kirim Logo", desc: "Upload logo perusahaan dan tentukan posisi bordir yang diinginkan." },
  { n: "03", title: "Proses Bordir", desc: "Tim kami menjahit logo dengan presisi tinggi di fasilitas in-house." },
  { n: "04", title: "Kirim ke Perusahaan", desc: "Produk dikemas rapi dan dikirim langsung ke alamat tim Anda, siap dipakai." },
];

export function HomePage() {
  return (
    <div className="bg-surface">
      <HeroIntro />

      {/* TRUST STRIP — single clean row */}
      <div className="border-b border-line bg-brand-700">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-6 py-3 text-sm font-medium text-white lg:px-10">
          {TRUST_BADGES.map((t, i) => (
            <div key={t.label} className="flex items-center gap-2">
              {i > 0 && <span className="hidden text-white/20 lg:inline">|</span>}
              <t.icon className="h-4 w-4 text-ochre-300" strokeWidth={2} />
              <span className="text-white/90">{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* STATS */}
      <section className="scroll-reveal bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <div key={s.label} className={`flex items-center gap-4 ${i < STATS.length - 1 ? "lg:border-r lg:border-line lg:pr-8" : ""}`}>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <s.icon className="h-6 w-6" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-2xl font-bold text-brand-700 lg:text-3xl">{s.value}</p>
                  <p className="text-sm text-ink-muted">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY OFISSIO */}
      <section className="scroll-reveal bg-surface-muted py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-700 text-sm font-bold text-white">01</span>
              <span className="text-sm font-bold uppercase tracking-wider text-brand-700">Mengapa Ofissio</span>
            </div>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-ink-strong sm:text-5xl">
              Bukan sekadar penjahit seragam, <span className="text-brand-600">kami brand sendiri.</span>
            </h2>
            <div className="mt-4 h-1.5 w-16 rounded-full bg-ochre-500" />
            <p className="mt-5 text-lg leading-relaxed text-ink-muted">
              Pola dan standar jahit dikembangkan sendiri sejak 2016. Logo diproses in-house. Konsultan dedicated menemani dari pembuatan sampel awal sampai repeat order.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ADVANTAGES.map((a, i) => (
              <div key={a.title} className="group relative overflow-hidden rounded-2xl border border-line bg-white p-7 transition-all duration-300 hover:border-brand-200 hover:shadow-soft-lg">
                <span className="absolute right-5 top-5 text-5xl font-bold text-brand-50 transition-colors group-hover:text-brand-100">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700 transition-all duration-300 group-hover:bg-brand-700 group-hover:text-white">
                  <a.icon className="h-7 w-7" strokeWidth={1.6} />
                </span>
                <h3 className="relative mt-5 text-lg font-bold text-ink-strong">{a.title}</h3>
                <p className="relative mt-2.5 text-base leading-relaxed text-ink-muted">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CAPABILITY / BORDIR — full-width video */}
      <section className="scroll-reveal relative overflow-hidden bg-brand-700 py-20 lg:py-28">
        <video autoPlay loop muted playsInline preload="auto" className="absolute inset-0 h-full w-full object-cover opacity-40">
          <source src="/KK-006.mp4" type="video/mp4" />
        </video>
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15 text-sm font-bold text-white backdrop-blur-sm">02</span>
              <span className="text-sm font-bold uppercase tracking-wider text-ochre-300">Bordir & Kustomisasi</span>
            </div>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Kami memegang setiap <span className="text-ochre-400">tahap produksi.</span>
            </h2>
            <div className="mt-4 h-1.5 w-16 rounded-full bg-ochre-400" />
            <p className="mt-5 text-lg leading-relaxed text-brand-100">
              Mesin bordir dan konveksi kami berjalan di satu atap. Logo, warna benang, dan potongan kain diperiksa oleh tim yang sama.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map((c) => (
              <div key={c.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ochre-400/15 text-ochre-400">
                    <ShieldCheck className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                  <div>
                    <p className="font-bold text-white">{c.title}</p>
                    <p className="mt-1 text-sm text-brand-200">{c.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCT CATEGORIES */}
      <section className="scroll-reveal bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-700 text-sm font-bold text-white">03</span>
              <span className="text-sm font-bold uppercase tracking-wider text-brand-700">Katalog Inti</span>
            </div>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-ink-strong sm:text-5xl">
              Dari kemeja hingga safety wear, <span className="text-brand-600">semua siap dibordir logo Anda.</span>
            </h2>
            <div className="mt-4 h-1.5 w-16 rounded-full bg-ochre-500" />
            <p className="mt-5 text-lg leading-relaxed text-ink-muted">
              Putar dan lihat produk dari segala sudut, semuanya siap dibordir logo perusahaan Anda.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((cat) => (
              <Link key={cat.title} href={cat.href} className="group overflow-hidden rounded-2xl border border-line bg-white transition-all duration-300 hover:border-brand-300 hover:shadow-soft-lg">
                <div className="relative aspect-square bg-gradient-to-br from-slate-50 to-brand-50/40">
                  <span className="absolute right-3 top-3 rounded-md bg-ochre-50 px-2 py-0.5 text-[10px] font-semibold text-ochre-700">
                    {cat.glb ? "3D" : "Katalog"}
                  </span>
                  {cat.glb ? (
                    <ProductCategory3DWrapper url={cat.glb} />
                  ) : cat.icon ? (
                    <div className="grid h-full place-items-center">
                      <span className="grid h-20 w-20 place-items-center rounded-2xl bg-brand-50 text-brand-700 transition-all duration-300 group-hover:bg-brand-700 group-hover:text-white">
                        <cat.icon className="h-10 w-10" strokeWidth={1.4} />
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-ink-strong">{cat.title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-ink-muted">{cat.desc}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-ochre-700 bg-ochre-50 px-2.5 py-1 rounded-md">{cat.tag}</span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 transition-transform group-hover:translate-x-0.5">
                      Lihat <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="scroll-reveal bg-surface-muted py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-700 text-sm font-bold text-white">04</span>
              <span className="text-sm font-bold uppercase tracking-wider text-brand-700">Cara Order</span>
            </div>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-ink-strong sm:text-5xl">
              4 langkah, selesai <span className="text-brand-600">dalam hitungan hari.</span>
            </h2>
            <div className="mt-4 h-1.5 w-16 rounded-full bg-ochre-500" />
          </div>
          <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="absolute left-16 top-8 hidden h-px w-[calc(100%-3rem)] bg-gradient-to-r from-brand-200 to-transparent lg:block" />
                )}
                <div className="relative grid h-16 w-16 place-items-center rounded-2xl border-2 border-brand-100 bg-white text-xl font-bold text-brand-700 shadow-soft-sm">
                  {s.n}
                </div>
                <h3 className="mt-5 text-lg font-bold text-ink-strong">{s.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-ink-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INDUSTRIES */}
      <section className="scroll-reveal bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-700 text-sm font-bold text-white">05</span>
                <span className="text-sm font-bold uppercase tracking-wider text-brand-700">Pilih Industri</span>
              </div>
              <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-ink-strong sm:text-5xl">
                Solusi seragam <span className="text-brand-600">berdasarkan industri.</span>
              </h2>
              <div className="mt-4 h-1.5 w-16 rounded-full bg-ochre-500" />
            </div>
            <Link href="/catalog" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-800">
              Lihat semua produk <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {INDUSTRY_META.map((m) => (
              <Link key={m.name} href={`/catalog?industri=${encodeURIComponent(m.name)}`}
                className="group flex flex-col rounded-2xl border border-line bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-soft-lg">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-lg font-bold text-brand-700 transition-all duration-300 group-hover:bg-brand-700 group-hover:text-white">
                  {m.name.charAt(0)}
                </span>
                <h3 className="mt-4 text-base font-bold text-ink-strong">{m.name}</h3>
                <p className="mt-1 text-sm text-ink-muted">{m.tagline}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-600">
                  Lihat produk <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="scroll-reveal bg-brand-700 py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-6 text-center lg:px-10">
          <div className="text-5xl font-bold text-ochre-400">&ldquo;</div>
          <blockquote className="mt-4 text-2xl font-semibold leading-relaxed text-white lg:text-3xl">
            Bordir logo kami rapi di setiap ukuran, dan tim Ofissio selalu update proses produksinya. Terasa seperti punya divisi seragam sendiri.
          </blockquote>
          <cite className="mt-6 block text-sm not-italic text-brand-200">
            — HR Manager, Perusahaan Manufaktur, Bekasi
          </cite>
        </div>
      </section>

      {/* CTA + FORM */}
      <section className="scroll-reveal bg-surface-muted py-20 lg:py-28" id="cta">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-700 text-sm font-bold text-white">06</span>
                <span className="text-sm font-bold uppercase tracking-wider text-brand-700">Mulai Proyek Seragam</span>
              </div>
              <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-ink-strong sm:text-5xl">
                Ngobrol dengan konsultan<br />seragam kami.
              </h2>
              <div className="mt-4 h-1.5 w-16 rounded-full bg-ochre-500" />
              <p className="mt-5 text-lg leading-relaxed text-ink-muted">
                Ceritakan jumlah tim, industri, dan tenggat waktu Anda. Kami akan membalas dengan rekomendasi bahan, estimasi harga, dan jadwal produksi dalam 1×24 jam kerja.
              </p>
              <div className="mt-8 flex flex-col gap-4">
                <a href="#" className="inline-flex items-center gap-3 border-b border-line pb-3 text-base font-semibold text-brand-700">
                  <Sparkles className="h-5 w-5 text-ochre-500" /> WhatsApp 08xx-xxxx-xxxx
                </a>
                <a href="#" className="inline-flex items-center gap-3 border-b border-line pb-3 text-base font-semibold text-brand-700">
                  <Truck className="h-5 w-5 text-ochre-500" /> hello@ofissio.co.id
                </a>
              </div>
            </div>
            <QuoteForm />
          </div>
        </div>
      </section>

      <ScrollRevealInit />
    </div>
  );
}
