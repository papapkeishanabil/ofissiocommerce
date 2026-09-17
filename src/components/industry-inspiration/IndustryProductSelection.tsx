import Link from "next/link";
import { ArrowRight, Compass, Shirt } from "lucide-react";

import type { OfissioProduct } from "@/features/products/product.types";
import { formatIDR } from "@/types/product";
import type { Industry } from "@/types/industry";
import { INSPIRATION_ROUTES } from "@/features/site-content/industry-inspiration.routes";

function productImage(product: OfissioProduct) {
  if (product.mainImage) return product.mainImage;
  if (product.slug === "kemeja-kantor-kk-006") return "/products/kk-006/KK-006-front-nobg.webp";
  return null;
}

export function IndustryProductSelection({ products, industry = "Bengkel", sectionId = "produk-bengkel" }: {
  products: OfissioProduct[];
  industry?: Industry;
  sectionId?: string;
}) {
  const visibleProducts = products.filter((product) => productImage(product)).slice(0, 6);
  const label = INSPIRATION_ROUTES[industry].label;
  const catalogHref = `/catalog?industri=${encodeURIComponent(industry)}`;

  return (
    <section id={sectionId} className="scroll-mt-20 bg-[#f8f4ec] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
      <div className="mx-auto max-w-[1440px]">
        <div className="mx-auto max-w-3xl text-center">
          <Compass className="mx-auto h-10 w-10 text-ochre-600" strokeWidth={1.45} aria-hidden="true" />
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.18em] text-ochre-700">Dari inspirasi ke pilihan produk</p>
          <h2 className="mt-4 text-4xl font-extrabold leading-[1.02] tracking-[-0.04em] text-brand-950 sm:text-5xl lg:text-6xl">
            Temukan seragam untuk ritme kerja tim Anda.
          </h2>
          <p className="mx-auto mt-5 max-w-[58ch] text-base leading-relaxed text-ink-muted sm:text-lg">
            Mulai dari kebutuhan tim Anda, lalu bandingkan model dalam pilihan {label}. Lihat detail setiap produk untuk memastikan bahan, ukuran, dan ketentuan pemesanannya.
          </p>
        </div>

        <div className="mt-14 flex items-end justify-between gap-6 border-b border-ochre-500/45 pb-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-ochre-700">Pilihan untuk</p>
            <h3 className="mt-2 text-2xl font-extrabold tracking-[-0.025em] text-brand-950 sm:text-3xl">{label}</h3>
          </div>
          <Link href={catalogHref} className="group hidden min-h-11 items-center gap-2 text-sm font-bold text-brand-950 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600 sm:inline-flex">
            Lihat seluruh produk <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>

        {visibleProducts.length > 0 ? (
          <div className={`mt-7 grid gap-5 ${visibleProducts.length === 1 ? "mx-auto max-w-md" : visibleProducts.length === 2 ? "mx-auto max-w-4xl sm:grid-cols-2" : "md:grid-cols-3"}`}>
            {visibleProducts.map((product) => {
              const image = productImage(product)!;
              return (
                <Link key={product.id} href={`/product/${product.slug}`} className="group overflow-hidden rounded-2xl border border-[#e5dac5] bg-white shadow-[0_24px_60px_-44px_rgba(8,29,67,0.52)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_32px_70px_-42px_rgba(8,29,67,0.46)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600">
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#eee9df]">
                    {/* Product media may come from the admin-configured WordPress host. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt={product.images?.[0]?.alt || product.name} loading="lazy" decoding="async" className="h-full w-full object-contain p-5 transition-transform duration-500 group-hover:scale-[1.035]" />
                    <span className="absolute left-4 top-4 rounded-full border border-white/75 bg-white/85 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-brand-950 backdrop-blur-sm">{product.category}</span>
                  </div>
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-xl font-extrabold leading-tight tracking-[-0.02em] text-brand-950">{product.name}</h4>
                        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{product.short_description}</p>
                      </div>
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ochre-500/50 text-brand-950 transition-colors group-hover:bg-brand-950 group-hover:text-white">
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </div>
                    <p className="mt-5 border-t border-line pt-4 text-sm font-bold text-brand-950">Mulai {formatIDR(product.priceFrom)} / pcs</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-7 rounded-2xl border border-[#e5dac5] bg-white px-6 py-10 text-center shadow-[0_24px_60px_-46px_rgba(8,29,67,0.4)]">
            <Shirt className="mx-auto h-9 w-9 text-ochre-600" strokeWidth={1.5} aria-hidden="true" />
            <h4 className="mt-4 text-xl font-extrabold text-brand-950">Pilihan seragam {label} sedang disiapkan</h4>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">Belum ada produk yang tersedia di kategori ini. Anda tetap bisa melihat koleksi lainnya atau menyampaikan kebutuhan seragam melalui Ofistant.</p>
            <Link href="/catalog" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">Jelajahi seluruh koleksi <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        )}

        <Link href={catalogHref} className="group mt-7 inline-flex min-h-12 items-center gap-2 border-b border-ochre-500 py-2 text-sm font-bold text-brand-950 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600 sm:hidden">
          Lihat seluruh produk {label} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
