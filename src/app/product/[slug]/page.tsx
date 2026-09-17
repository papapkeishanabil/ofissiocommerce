// src/app/product/[slug]/page.tsx

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { productServerService } from "@/features/products/product.server-service";
import { ProductDetail } from "@/components/product/ProductDetail";
import { getGlobalEmbroideryPricing } from "@/features/embroidery-pricing/global-embroidery-pricing.service";
import { getMoqSettings } from "@/features/moq-settings/moq-settings.service";
import { getSizeChartStandards } from "@/features/size-charts/size-chart.service";
import { resolveSizeChart } from "@/features/size-charts/resolve-size-chart";
import { readOptionalCommerceSetting } from "@/features/products/product-commerce-settings";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Global embroidery pricing is live Supabase data and must not be frozen into
// a build-time product page snapshot.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await productServerService.getProductBySlug(slug);
  if (!product) return { title: "Produk tidak ditemukan" };
  return {
    title: product.name,
    // short_description sudah dikurasi mapper (fallback ke potongan deskripsi)
    // sehingga meta lebih bersih daripada memotong deskripsi penuh.
    description: (product.short_description || product.description).slice(0, 140),
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const product = await productServerService.getProductBySlug(slug);
  if (!product) notFound();
  const [pricingState, moqState, sizeChartState] = await Promise.all([
    readOptionalCommerceSetting(getGlobalEmbroideryPricing),
    readOptionalCommerceSetting(getMoqSettings),
    readOptionalCommerceSetting(getSizeChartStandards),
  ]);
  // Standar ukuran otomatis mengikuti kategori produk; tanpa kecocokan atau
  // saat sumber data tidak tersedia, sizeChart dikosongkan supaya panduan
  // ukuran tersembunyi total (tidak ada tabel kosong).
  const resolvedSizeChart = resolveSizeChart(sizeChartState?.standards ?? [], {
    categorySlugs: product.categorySlugs ?? [],
    availableSizes: product.available_sizes,
  });
  return (
    <ProductDetail
      product={{ ...product, sizeChart: resolvedSizeChart?.rows ?? [] }}
      globalEmbroideryPricing={pricingState?.pricing ?? { enabled: false, mode: "flat_per_piece", zones: [] }}
      moqSettings={moqState?.settings}
      pricingUnavailable={!pricingState}
      purchasingUnavailable={!moqState}
      sizeChartStandardName={resolvedSizeChart?.standard.name}
    />
  );
}
