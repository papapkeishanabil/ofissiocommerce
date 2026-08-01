// src/app/product/[slug]/page.tsx

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { productServerService } from "@/features/products/product.server-service";
import { ProductDetail } from "@/components/product/ProductDetail";
import { getGlobalEmbroideryPricing } from "@/features/embroidery-pricing/global-embroidery-pricing.service";

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
    description: product.description.slice(0, 140),
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const product = await productServerService.getProductBySlug(slug);
  if (!product) notFound();
  const { pricing } = await getGlobalEmbroideryPricing();
  return <ProductDetail product={product} globalEmbroideryPricing={pricing} />;
}
