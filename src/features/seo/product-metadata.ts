
import { effectivePageSeo } from "./page-seo";
import { productAutomaticSeo, type ProductSeoInput } from "./product-automatic-seo";
import type { Metadata } from "next";
import type { OfissioProduct } from "@/features/products/product.types";
import { productImages, productUrl } from "@/lib/seo";

function plainText(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\\[nr]/g, " ").replace(/\s+/g, " ").trim();
}

export function productSearchName(product: Pick<OfissioProduct, "name" | "slug">): string {
  const name = plainText(product.name);
  return name;
}

/** Prefer complete sentences; use an ellipsis only when a long sentence must be shortened. */
export function productSearchSnippet(value: string, limit = 170): string {
  const text = plainText(value);
  if (text.length <= limit) return text;
  const head = text.slice(0, limit + 1);
  const ends = [...head.matchAll(/[.!?](?=\s|$)/g)].map(match => match.index! + 1);
  const sentenceEnd = ends.at(-1);
  if (sentenceEnd && sentenceEnd >= Math.floor(limit / 2)) return text.slice(0, sentenceEnd);
  const cut = text.slice(0, limit - 1);
  const wordEnd = cut.lastIndexOf(" ");
  return `${cut.slice(0, wordEnd > 0 ? wordEnd : cut.length).replace(/[,;:—–-]+$/, "")}…`;
}

export function productSeoInput(product: OfissioProduct): ProductSeoInput {
  return product.seoInput ?? {
    name: product.name, modelCode: product.modelCode || product.sku, description: product.description,
    materials: product.material ? [product.material] : [], colors: product.colors ?? product.available_colors ?? [],
    sleeves: product.sleeve_type ? [product.sleeve_type] : [],
  };
}

export function productSearchDescription(product: OfissioProduct): string {
  return productAutomaticSeo(productSeoInput(product)).description;
}

export function productSearchMetadata(product: OfissioProduct): Metadata {
  const { title, description } = effectivePageSeo(product.seo, productAutomaticSeo(productSeoInput(product)));
  const url = productUrl(product.slug);
  const images = productImages(product);
  return {
    keywords: null,
    title: { absolute: title }, description,
    alternates: { canonical: url },
    robots: product.source === "mock" ? { index: false, follow: false } : undefined,
    openGraph: { type: "website", siteName: "Ofissio", locale: "id_ID", title, description, url, images },
    twitter: { card: images.length ? "summary_large_image" : "summary", title, description, images },
  };
}
