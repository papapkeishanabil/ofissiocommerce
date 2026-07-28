// src/app/product/[slug]/page.tsx

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { productService } from "@/features/products/product.service";
import { ProductDetail } from "@/components/product/ProductDetail";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return productService.getPublishedProducts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = productService.getProductBySlug(slug);
  if (!product) return { title: "Produk tidak ditemukan" };
  return {
    title: product.name,
    description: product.description.slice(0, 140),
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const product = productService.getProductBySlug(slug);
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
