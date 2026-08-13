import Link from "next/link";
import {
  Anchor, ArrowRight, Award, Boxes, Briefcase, Building2, Coffee, Droplets,
  Factory, FileText, GraduationCap, Hammer, HardHat, Landmark,
  MessageSquare, Package, PawPrint, Phone, Pickaxe, Plus, Scissors,
  ShieldCheck, Shirt, Sparkles, Stethoscope, Store, Truck, Upload, Users,
  UtensilsCrossed, Wrench,
  type LucideIcon,
} from "lucide-react";

import { HeroIntro } from "./HeroIntro";
import { OfistantOpenButton } from "./OfistantOpenButton";
import { ProductCategory3DWrapper } from "./ProductCategory3DWrapper";
import { ScrollRevealInit } from "./ScrollRevealInit";
import { resolveHomepageIcon } from "@/features/site-content/icon-registry";
import { getPublicSiteContent } from "@/features/site-content/site-content.service";
import type { Industry } from "@/types/industry";

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

const STEPS: { n: string; title: string; desc: string; icon: LucideIcon }[] = [
  { n: "1", title: "Ceritakan Usaha & Jumlah Tim", desc: "Jenis usaha, berapa pegawai, dan kapan dibutuhkan.", icon: MessageSquare },
  { n: "2", title: "Pilih Model / Minta Rekomendasi", desc: "Pilih dari paket, atau minta kami rekomendasikan yang pas.", icon: Shirt },
  { n: "3", title: "Kirim Logo & Ukuran", desc: "Upload logo usaha dan ukuran tiap pegawai.", icon: Upload },
  { n: "4", title: "Terima Quotation", desc: "Harga jelas, lead time jelas, tanpa biaya tersembunyi.", icon: FileText },
  { n: "5", title: "Produksi & Tracking", desc: "Pantau proses produksi sampai seragam tiba di lokasi Anda.", icon: Truck },
];

/* Presentational industry tiles for the "Cocok untuk Berbagai Usaha" section.
   Labels are richer than the canonical Industry names, and several tiles
   (Kesehatan, F&B, Security, Retail) appear in BOTH groups with distinct copy —
   but every tile routes via its canonical Industry name, so dedupe is automatic
   through normalizeIndustrySlug (both the query and each product tag converge
   on the same Registry B slug). */
type SegmentTile = { label: string; icon: LucideIcon; industry: Industry };
type SegmentGroup = { label: string; meta: string; dot: string; tiles: SegmentTile[] };

const SEGMENT_GROUPS: SegmentGroup[] = [
  {
    label: "Bisnis Naik Kelas",
    meta: "Mulai 8 pcs · reorder fleksibel",
    dot: "bg-ochre-500",
    tiles: [
      { label: "Bengkel Motor & Mobil", icon: Wrench, industry: "Bengkel" },
      { label: "Apotek & Klinik", icon: Plus, industry: "Kesehatan" },
      { label: "Toko Retail & Minimarket", icon: Store, industry: "Retail" },
      { label: "Toko Grosir", icon: Boxes, industry: "Grosir" },
      { label: "Cafe & Restoran", icon: Coffee, industry: "F&B" },
      { label: "Laundry", icon: Droplets, industry: "Laundry" },
      { label: "Barbershop & Salon", icon: Scissors, industry: "Salon" },
      { label: "Toko Bangunan", icon: Hammer, industry: "Bangunan" },
      { label: "Toko Sparepart", icon: Package, industry: "Sparepart" },
      { label: "Pet Shop", icon: PawPrint, industry: "Petshop" },
      { label: "Ekspedisi Lokal", icon: Truck, industry: "Ekspedisi" },
      { label: "Security & Parkir", icon: ShieldCheck, industry: "Security" },
    ],
  },
  {
    label: "Solusi Korporasi",
    meta: "Volume besar · quotation formal · multi-divisi",
    dot: "bg-brand-300",
    tiles: [
      { label: "Konstruksi & Infrastruktur", icon: HardHat, industry: "Konstruksi" },
      { label: "Manufaktur & Pabrik", icon: Factory, industry: "Manufaktur" },
      { label: "Pertambangan & Migas", icon: Pickaxe, industry: "Pertambangan" },
      { label: "Perhotelan & Hospitality", icon: Building2, industry: "Perhotelan" },
      { label: "BUMN & Pemerintahan", icon: Landmark, industry: "BUMN" },
      { label: "Maritim & Logistik", icon: Anchor, industry: "Maritim" },
      { label: "Retail Chain & Dept Store", icon: Store, industry: "Retail" },
      { label: "Security & Pertahanan", icon: ShieldCheck, industry: "Security" },
      { label: "Korporasi & Perkantoran", icon: Briefcase, industry: "Corporate" },
      { label: "Rumah Sakit & Kesehatan", icon: Stethoscope, industry: "Kesehatan" },
      { label: "Pendidikan & Universitas", icon: GraduationCap, industry: "Pendidikan" },
      { label: "F&B Chain & Restoran", icon: UtensilsCrossed, industry: "F&B" },
    ],
  },
];

type Pkg = {
  name: string; icon: LucideIcon; items: string; cocokUntuk: string;
  opsiLogo: string; href: string; scale?: boolean;
};

const PACKAGES: Pkg[] = [
  { name: "Paket Bengkel", icon: Wrench, items: "Polo kerja, kemeja, celana tahan noda", cocokUntuk: "Bengkel motor/mobil & toko sparepart", opsiLogo: "Bordir dada atau dTF tahan panas", href: "/catalog?industri=Bengkel" },
  { name: "Paket Toko & Retail", icon: Store, items: "Kemeja/polo staf + name tag", cocokUntuk: "Toko retail, grosir, kelontong, toko mas", opsiLogo: "Bordir dada + nama pegawai", href: "/catalog?industri=Retail" },
  { name: "Paket Apotek & Klinik", icon: Plus, items: "Seragam medis & jas lab higienis", cocokUntuk: "Apotek, klinik, praktek dokter", opsiLogo: "Bordir halus, kain mudah disterilkan", href: "/catalog?industri=Kesehatan" },
  { name: "Paket Cafe & Service", icon: Coffee, items: "Apron, kemeja pelayan, polo barista", cocokUntuk: "Cafe, restoran, bakery, jasa service", opsiLogo: "Bordir atau dTF tahan cuci panas", href: `/catalog?industri=${encodeURIComponent("F&B")}` },
  { name: "Paket Corporate", icon: Building2, items: "Kemeja oxford, polo, blazer, identitas divisi", cocokUntuk: "Kantor, koperasi, layanan, hospitality", opsiLogo: "Bordir custom multi-divisi", href: "/catalog?industri=Corporate", scale: true },
  { name: "Paket Lapangan / Konstruksi", icon: HardHat, items: "Wearpack, rompi safety, jaket lapangan", cocokUntuk: "Konstruksi, tambang, ekspedisi, lapangan", opsiLogo: "Bordir tahan cuaca & abrasi", href: "/catalog?industri=Konstruksi", scale: true },
];

export async function HomePage() {
  // Admin-editable content (cached, tagged "site-content"; revalidated on
  // save from /admin/site-content). Falls back to the registry defaults if
  // the table is absent or a row is corrupt, so this page never breaks.
  const content = await getPublicSiteContent();
  return (
    <div className="bg-surface">
      <HeroIntro />

      {/* TRUST STRIP — 4 stats on navy */}
      <section aria-label="Keunggulan Ofissio" className="bg-brand-700">
        <div className="mx-auto grid max-w-[1600px] grid-cols-2 gap-x-6 gap-y-5 px-6 py-6 text-white lg:grid-cols-4">
          {content.trust.items.map((t) => {
            const Icon = resolveHomepageIcon(t.icon);
            return (
              <div key={t.label} className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-ochre-300">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <div>
                  <div className="text-lg font-extrabold leading-tight tabular-nums">{t.value}</div>
                  <div className="text-xs font-medium text-white/70">{t.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 01 — BISNIS NAIK KELAS */}
      <section id="naik-kelas" className="scroll-reveal scroll-mt-24 bg-surface-muted py-20 lg:py-28">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-700 text-sm font-bold text-white">01</span>
              <span className="text-sm font-bold uppercase tracking-wider text-brand-700">Bisnis Naik Kelas</span>
            </div>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-ink-strong sm:text-5xl lg:text-[3.75rem]">
              Bisnis Naik Kelas Dimulai dari <span className="text-brand-600">Tim yang Tampil Profesional.</span>
            </h2>
            <div className="mt-4 h-[3px] w-10 rounded-full bg-ochre-500" />
            <p className="mt-5 text-xl leading-relaxed text-ink-muted lg:text-2xl">
              Seragam bukan sekadar baju — ia adalah identitas bisnis yang dilihat pelanggan setiap hari. Dari anggota tim pertama hingga tim yang terus bertambah, Ofissio menjaga tampilan bisnis Anda tetap konsisten dan profesional di setiap fase pertumbuhan.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {content.bisnis_naik_kelas.items.map((b, i) => {
              const Icon = resolveHomepageIcon(b.icon);
              return (
                <div key={b.title} className="group relative overflow-hidden rounded-2xl border border-line bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-soft-lg">
                  <span className="absolute right-5 top-5 text-5xl font-bold text-brand-50 transition-colors group-hover:text-brand-100">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700 transition-all duration-300 group-hover:bg-brand-700 group-hover:text-white">
                    <Icon className="h-7 w-7" strokeWidth={1.6} />
                  </span>
                  <h3 className="relative mt-5 text-lg font-bold text-ink-strong">{b.title}</h3>
                  <p className="relative mt-2.5 text-base leading-relaxed text-ink-muted">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 02 — COCOK UNTUK BERBAGAI USAHA */}
      <section id="usaha" className="scroll-reveal scroll-mt-24 bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-700 text-sm font-bold text-white">02</span>
                <span className="text-sm font-bold uppercase tracking-wider text-brand-700">Cocok untuk Berbagai Usaha</span>
              </div>
              <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-ink-strong sm:text-5xl lg:text-[3.75rem]">
                Dari Bengkel sampai Perusahaan, <span className="text-brand-600">Seragamnya Bisa Disesuaikan.</span>
              </h2>
              <div className="mt-4 h-[3px] w-10 rounded-full bg-ochre-500" />
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">
                Untuk bisnis dengan tim beberapa orang maupun korporasi multi-cabang dengan ribuan karyawan — Ofissio menyesuaikan bahan, model, dan standar bordir sesuai skala Anda. Tidak menemukan jenis usaha Anda? Ceritakan ke Ofistant.
              </p>
            </div>
            <Link href="/catalog" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-800">
              Lihat semua produk <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-14 space-y-12">
            {SEGMENT_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                  <div className="flex items-center gap-3">
                    <span className={`h-2 w-2 rounded-full ${group.dot}`} aria-hidden="true" />
                    <span className="text-sm font-bold uppercase tracking-wider text-ink-strong">{group.label}</span>
                  </div>
                  <span className="text-xs font-medium text-ink-muted sm:text-sm">{group.meta}</span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {group.tiles.map((tile) => (
                    <Link
                      key={tile.label}
                      href={`/catalog?industri=${encodeURIComponent(tile.industry)}`}
                      aria-label={`Lihat produk seragam untuk ${tile.label}`}
                      className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-line bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-soft-lg sm:p-5"
                    >
                      <span className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-ochre-500 transition-transform duration-300 group-hover:scale-x-100" aria-hidden="true" />
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 transition-colors duration-300 group-hover:bg-brand-700 group-hover:text-white">
                        <tile.icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
                      </span>
                      <span className="text-sm font-bold text-ink-strong">{tile.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 03 — PAKET SERAGAM POPULER */}
      <section id="paket" className="scroll-reveal scroll-mt-24 bg-surface-muted py-20 lg:py-28">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-700 text-sm font-bold text-white">03</span>
              <span className="text-sm font-bold uppercase tracking-wider text-brand-700">Paket Seragam Populer</span>
            </div>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-ink-strong sm:text-5xl lg:text-[3.75rem]">
              Paket Siap Pakai — <span className="text-brand-600">Tinggal Pilih, Kirim Logo, Jadi.</span>
            </h2>
            <div className="mt-4 h-[3px] w-10 rounded-full bg-ochre-500" />
            <p className="mt-5 text-xl leading-relaxed text-ink-muted lg:text-2xl">
              Tiap paket sudah dipadukan dengan bahan dan model yang cocok untuk jenis usahanya. Mulai dari jumlah kecil, dan bisa diulang kapan saja saat pegawai bertambah.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PACKAGES.map((p) => (
              <div key={p.name} className="group flex flex-col rounded-2xl border border-line bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-soft-lg">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700 transition-colors duration-300 group-hover:bg-brand-700 group-hover:text-white">
                      <p.icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    <h3 className="text-lg font-bold text-ink-strong">{p.name}</h3>
                  </div>
                  {p.scale && (
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-700">Skala besar</span>
                  )}
                </div>
                <dl className="mt-5 space-y-2.5 text-sm">
                  <div className="flex gap-2">
                    <dt className="shrink-0 font-bold text-ink-strong">Isi:</dt>
                    <dd className="text-ink-muted">{p.items}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 font-bold text-ink-strong">Cocok untuk:</dt>
                    <dd className="text-ink-muted">{p.cocokUntuk}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 font-bold text-ink-strong">Logo:</dt>
                    <dd className="text-ink-muted">{p.opsiLogo}</dd>
                  </div>
                </dl>
                <Link
                  href={p.href}
                  className="mt-6 inline-flex items-center gap-1.5 self-start border-t border-line pt-4 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-800"
                >
                  Konsultasikan Paket <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 04 — BORDIR & KUSTOMISASI — full-width video */}
      <section className="scroll-reveal relative overflow-hidden bg-brand-700 py-20 lg:py-28">
        <video autoPlay loop muted playsInline preload="auto" className="absolute inset-0 h-full w-full object-cover opacity-40">
          <source src="/KK-006.mp4" type="video/mp4" />
        </video>
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative mx-auto max-w-[1600px] px-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15 text-sm font-bold text-white backdrop-blur-sm">04</span>
              <span className="text-sm font-bold uppercase tracking-wider text-ochre-300">Bordir & Kustomisasi</span>
            </div>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-[3.75rem]">
              Kami memegang setiap <span className="text-ochre-400">tahap produksi.</span>
            </h2>
            <div className="mt-4 h-[3px] w-10 rounded-full bg-ochre-400" />
            <p className="mt-5 text-xl leading-relaxed text-brand-100 lg:text-2xl">
              Mesin bordir dan konveksi kami berjalan di satu atap. Logo, warna benang, dan potongan kain diperiksa oleh tim yang sama.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map((c) => (
              <div key={c.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]">
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

      {/* 05 — CARA ORDER MUDAH */}
      <section id="cara" className="scroll-reveal scroll-mt-24 bg-cool-100 py-20 lg:py-28">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-700 text-sm font-bold text-white">05</span>
              <span className="text-sm font-bold uppercase tracking-wider text-brand-700">Cara Order Mudah</span>
            </div>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-ink-strong sm:text-5xl lg:text-[3.75rem]">
              Lima Langkah, <span className="text-brand-600">Tanpa Ribet.</span>
            </h2>
            <div className="mt-4 h-[3px] w-10 rounded-full bg-ochre-500" />
            <p className="mt-5 text-xl leading-relaxed text-ink-muted lg:text-2xl">
              Dari obrolan pertama sampai seragam sampai, semua bisa Anda ikuti lewat Ofistant. Tidak perlu email bolak-balik atau pusing nego dari nol.
            </p>
          </div>
          <div className="how-journey mt-14">
            {/* Embroidery running-stitch + traveling needle (desktop 5-across).
                Decorative — the numbers on the nodes carry the order semantics. */}
            <div className="how-stitch-h" aria-hidden="true">
              <svg viewBox="0 0 1000 10" preserveAspectRatio="none">
                <line className="under" x1="0" y1="5" x2="1000" y2="5" strokeLinecap="round" strokeDasharray="11 9" />
                <line className="main" x1="0" y1="5" x2="1000" y2="5" strokeLinecap="round" strokeDasharray="11 9" />
              </svg>
              <span className="how-needle" />
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map((s) => (
                <div key={s.n} className="how-step flex flex-col items-center text-center">
                  <div className="how-node">{s.n}</div>
                  <div className="how-card mt-6 w-full rounded-2xl border border-line bg-white p-6 shadow-soft-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-md">
                    <span className="how-icon mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
                      <s.icon className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 text-lg font-bold text-ink-strong">{s.title}</h3>
                    <p className="mt-2 text-base leading-relaxed text-ink-muted">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 06 — SOLUSI KORPORASI — navy band */}
      <section className="scroll-reveal relative overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 py-20 lg:py-28">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15 text-sm font-bold text-white">06</span>
              <span className="text-sm font-bold uppercase tracking-wider text-ochre-300">Solusi Korporasi</span>
            </div>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-[3.75rem]">
              Solusi Korporasi dengan <span className="text-ochre-400">Standar Pengadaan Profesional.</span>
            </h2>
            <div className="mt-4 h-[3px] w-10 rounded-full bg-ochre-400" />
            <p className="mt-5 text-xl leading-relaxed text-brand-100 lg:text-2xl">
              Untuk pengadaan seragam skala perusahaan, Ofissio siap dengan proses yang dipahami tim procurement: quotation formal, custom logo multi-divisi, tracking order per batch, dan pengiriman ke seluruh Indonesia.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {content.korporasi.items.map((c) => {
              const Icon = resolveHomepageIcon(c.icon);
              return (
                <div key={c.title} className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.08]">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-ochre-400/15 text-ochre-400">
                    <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-white">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-brand-200">{c.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 07 — PRODUK PILIHAN (3D katalog) */}
      <section id="produk" className="scroll-reveal scroll-mt-24 bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-700 text-sm font-bold text-white">07</span>
              <span className="text-sm font-bold uppercase tracking-wider text-brand-700">Produk Pilihan</span>
            </div>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-ink-strong sm:text-5xl lg:text-[3.75rem]">
              Kurasi Produk <span className="text-brand-600">Siap Bordir Logo.</span>
            </h2>
            <div className="mt-4 h-[3px] w-10 rounded-full bg-ochre-500" />
            <p className="mt-5 text-xl leading-relaxed text-ink-muted lg:text-2xl">
              Model-model yang paling sering dipakai berbagai bisnis dan korporasi. Semua ready stock dan siap dibordir logo usaha Anda — ceritakan kebutuhan ke Ofistant untuk rekomendasi bahan & ukuran.
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

      {/* CTA — Ofistant + WhatsApp */}
      <section id="cta" className="scroll-reveal scroll-mt-24 bg-gradient-to-br from-brand-700 to-brand-900 py-20 lg:py-28">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ochre-300">
                <Sparkles className="h-4 w-4" aria-hidden="true" /> Mulai Proyek Seragam
              </div>
              <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-[3.75rem]">
                Ngobrol dulu dengan <span className="text-ochre-400">Ofistant.</span>
              </h2>
              <div className="mt-4 h-[3px] w-10 rounded-full bg-ochre-400" />
              <p className="mt-5 max-w-xl text-xl leading-relaxed text-brand-100 lg:text-2xl">
                Ceritakan jenis usaha, jumlah tim, dan tenggat Anda. Kami balas dengan rekomendasi bahan, estimasi harga, dan jadwal produksi dalam 1×24 jam kerja.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row lg:flex-col lg:items-start">
              <OfistantOpenButton
                label="Konsultasi dengan Ofistant"
                className="inline-flex items-center gap-2 rounded-xl bg-ochre-400 px-7 py-3.5 text-sm font-bold text-brand-900 transition-all hover:bg-ochre-300"
              />
              <Link
                href="https://wa.me/6280000000000"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-7 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
              >
                <Phone className="h-4 w-4" aria-hidden="true" /> WhatsApp 08xx-xxxx-xxxx
              </Link>
            </div>
          </div>
        </div>
      </section>

      <ScrollRevealInit />
    </div>
  );
}
