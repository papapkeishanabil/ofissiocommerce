import { readFileSync } from "node:fs";
import { AdminProductForm } from "@/features/products/components/AdminProductForm";
import { ProductDetail } from "@/components/product/ProductDetail";
import { CatalogProductCard } from "@/components/catalog/CatalogProductCard";
import type { OfissioProduct } from "@/features/products/product.types";
import "@/app/catalog.css";

export default async function VariantVerification({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const product = JSON.parse(readFileSync(".tmp-variant-fixture.json", "utf8")) as OfissioProduct;
  if (view === "detail") return <ProductDetail product={product} globalEmbroideryPricing={{ enabled: false, mode: "flat_per_piece", zones: [] }} />;
  if (view === "simple") return <ProductDetail product={{ ...product, sku: "KL-003", productKind: "simple", variantOptions: [], productVariants: [], available_sizes: ["OS"] }} globalEmbroideryPricing={{ enabled: false, mode: "flat_per_piece", zones: [] }} />;
  if (view === "card") return <div className="mx-auto max-w-sm p-4"><CatalogProductCard product={{ ...product, mainImage: undefined, images: [] }} /></div>;
  return <div className="mx-auto max-w-6xl p-5"><AdminProductForm mode="create" routeMoqDefaults={{ fulfillment: 1, customization: 1, production: 20, embroidery: 12 }} options={{
    categories: [{ id: 1, name: "Kemeja", slug: "kemeja", active: true, description: "", productCount: 1, synonyms: [], source: "woocommerce" }],
    industries: [{ id: "office", name: "Corporate", slug: "office", active: true, description: "", synonyms: [], sortOrder: 1, createdAt: "", updatedAt: "" }],
    attributes: [],
  }} /></div>;
}
