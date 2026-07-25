// src/components/home/HomePage.tsx

import Link from "next/link";

import { INDUSTRY_META } from "@/data/industries";
import { getAllProducts } from "@/data/products";
import { formatIDR } from "@/types/product";
import { fulfillmentLabel } from "@/types/industry";
import { ArrowRight, Boxes, ShieldCheck, Truck } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { ProductImagePlaceholder } from "@/components/catalog/ProductImagePlaceholder";

export function HomePage() {
  const featured = getAllProducts().slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 px-6 py-10 text-white lg:px-12 lg:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-100">
          Conversational B2B Commerce
        </p>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold leading-tight lg:text-5xl">
          Seragam kerja perusahaan, dalam satu platform.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-brand-50/90 lg:text-base">
          Telusuri katalog, atur size matrix per tim, ajukan quotation, dan
          lacak produksi — dibantu Ofistant, asisten pengadaan digital Anda.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink
            href="/catalog"
            size="lg"
            className="bg-white text-brand-700 hover:bg-brand-50"
          >
            Mulai Belanja
            <ArrowRight className="h-4 w-4" />
          </ButtonLink>
          <ButtonLink
            href="/catalog?industri=Konstruksi"
            size="lg"
            className="border border-white/30 bg-white/10 text-white hover:bg-white/20"
          >
            Lihat contoh industri
          </ButtonLink>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4 text-xs text-brand-50">
          <Feature icon={<Boxes className="h-4 w-4" />} text="Size matrix per ukuran" />
          <Feature icon={<ShieldCheck className="h-4 w-4" />} text="Bordir logo kustom" />
          <Feature icon={<Truck className="h-4 w-4" />} text="Tracking produksi & kirim" />
        </div>
      </section>

      {/* Industries */}
      <section className="mt-8">
        <SectionTitle
          eyebrow="Pilih industri"
          title="Seragam untuk setiap sektor"
          desc="Klik kartu untuk melihat produk yang relevan dengan industri Anda."
        />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {INDUSTRY_META.map((m) => (
            <Link
              key={m.name}
              href={`/catalog?industri=${encodeURIComponent(m.name)}`}
              className="group flex flex-col gap-1 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-brand-400 hover:bg-brand-50/30"
            >
              <span className="text-sm font-bold text-ink">{m.name}</span>
              <span className="text-[11px] leading-snug text-ink-muted">
                {m.tagline}
              </span>
              <span className="mt-2 inline-flex items-center text-xs font-semibold text-brand-700 group-hover:underline">
                Lihat produk <ArrowRight className="ml-1 h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="mt-10">
        <SectionTitle
          eyebrow="Produk unggulan"
          title="Pilihan populer"
          desc="Sebagian produk dapat dipakai lintas industri."
        />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {featured.map((p) => (
            <Link
              key={p.id}
              href={`/product/${p.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition-shadow hover:shadow-md"
            >
              <ProductImagePlaceholder
                name={p.name}
                accentColor={p.accentColor}
                category={p.category}
                className="aspect-[4/3] w-full"
              />
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-center justify-between text-[11px] text-ink-muted">
                  <span className="font-semibold uppercase">{p.category}</span>
                  <span className="font-mono">{p.sku}</span>
                </div>
                <span className="text-sm font-bold text-ink group-hover:text-brand-700">
                  {p.name}
                </span>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="text-xs text-ink-muted">Mulai dari</span>
                  <span className="text-base font-bold text-ink">
                    {formatIDR(p.priceFrom)}
                  </span>
                </div>
                <Badge
                  tone={p.fulfillment === "READY_STOCK" ? "success" : "amber"}
                  className="mt-1 self-start"
                >
                  {fulfillmentLabel(p.fulfillment)}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-6 text-center">
          <ButtonLink href="/catalog" variant="outline">
            Lihat semua produk
            <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/15">
        {icon}
      </span>
      <span>{text}</span>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-xl font-bold text-ink lg:text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-ink-muted">{desc}</p>
    </div>
  );
}
