// src/app/product/[slug]/page.tsx

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { productStructuredData, serializeJsonLd } from "@/lib/seo";
import { cache } from "react";
import { productSearchMetadata } from "@/features/seo/product-metadata";

import { productServerService } from "@/features/products/product.server-service";
import { ProductDetail } from "@/components/product/ProductDetail";
import { ProductTaxonomyContext } from "@/components/product/ProductTaxonomyContext";
import { listIndustryMaster } from "@/features/catalog-taxonomy/catalog-taxonomy.service";
import { getGlobalEmbroideryPricing } from "@/features/embroidery-pricing/global-embroidery-pricing.service";
import { getMoqSettings } from "@/features/moq-settings/moq-settings.service";
import { getSizeChartStandards } from "@/features/size-charts/size-chart.service";
import { resolveSizeChart } from "@/features/size-charts/resolve-size-chart";
import { resolveSleeveSizeCharts } from "@/features/size-charts/sleeve-size-charts";
import { isSleeveOption } from "@/features/products/product-variants";
import { readOptionalCommerceSetting } from "@/features/products/product-commerce-settings";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variant?: string | string[] }>;
}

// Global embroidery pricing is live Supabase data and must not be frozen into
// a build-time product page snapshot.
export const dynamic = "force-dynamic";
const getProduct = cache((slug: string) => productServerService.getProductBySlug(slug));

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  return productSearchMetadata(product);
}

export default async function Page({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const initialVariantSku = typeof query.variant === "string" ? query.variant : undefined;
  const product = await getProduct(slug);
  if (!product) notFound();
  const [pricingState, moqState, sizeChartState, industryLabels] = await Promise.all([
    readOptionalCommerceSetting(getGlobalEmbroideryPricing),
    readOptionalCommerceSetting(getMoqSettings),
    readOptionalCommerceSetting(getSizeChartStandards),
    listIndustryMaster().catch(() => []),
  ]);
  // Standar ukuran otomatis mengikuti kategori produk; tanpa kecocokan atau
  // saat sumber data tidak tersedia, sizeChart dikosongkan supaya panduan
  // ukuran tersembunyi total (tidak ada tabel kosong).
  const resolvedSizeChart = resolveSizeChart(sizeChartState?.standards ?? [], {
    slug: product.slug,
    gender: product.gender,
    sizeChartId: product.sizeChartId,
    categorySlugs: product.categorySlugs ?? [],
    availableSizes: product.available_sizes,
  });
  const sleeveSizeCharts = resolveSleeveSizeCharts(sizeChartState?.standards ?? [], {
    sleeveSizeChartIds: product.sleeveSizeChartIds,
    slug: product.slug, gender: product.gender, sizeChartId: product.sizeChartId,
    categorySlugs: product.categorySlugs ?? [], availableSizes: product.available_sizes,
  }, product.variantOptions?.find(option => isSleeveOption(option.name))?.values ?? []);
  const structuredData = productStructuredData(product);
  return (
    <>
    {structuredData && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} />}
    <ProductDetail
      taxonomyContent={<ProductTaxonomyContext product={product} industries={industryLabels} />}
      key={`${product.id}:${initialVariantSku ?? ""}`}
      initialVariantSku={initialVariantSku}
      product={{ ...product, sizeChart: resolvedSizeChart?.rows ?? [] }}
      globalEmbroideryPricing={pricingState?.pricing ?? { enabled: false, mode: "flat_per_piece", zones: [] }}
      moqSettings={moqState?.settings}
      pricingUnavailable={!pricingState}
      purchasingUnavailable={!moqState}
      sizeChartStandardName={resolvedSizeChart?.standard.name}
      sleeveSizeCharts={sleeveSizeCharts}
    />
    </>
  );
}
