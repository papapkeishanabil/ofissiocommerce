import { readFileSync } from "node:fs";
import { ProductDetail } from "@/components/product/ProductDetail";
import type { OfissioProduct } from "@/features/products/product.types";

export default async function ColorPickerVerification({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  const fixture = JSON.parse(readFileSync(".tmp-variant-fixture.json", "utf8")) as OfissioProduct;
  const colors = ["Coksu", "Milo", "Bronze"];
  const variants = colors.flatMap((color, colorIndex) => ["Pendek", "Panjang"].flatMap((sleeve, sleeveIndex) => ["S", "M"].map((size, sizeIndex) => ({
    id: 9000 + colorIndex * 4 + sleeveIndex * 2 + sizeIndex,
    sku: `TEST-${color}-${sleeve}-${size}`,
    options: { Warna: color, Lengan: sleeve, Ukuran: size },
    imageSrc: color === "Bronze" ? "" : `https://images.example/${color}-${sleeve}.svg`,
    fabricColor: color === "Bronze" ? "#987654" : undefined,
    regularPrice: sleeve === "Panjang" ? 120000 : 100000,
  }))));
  const product: OfissioProduct = {
    ...fixture, name: "Kemeja uji pilihan warna", colors, available_colors: colors,
    mainImage: "https://images.example/Coksu-Pendek.svg", images: [],
    variantOptions: [{ name: "Warna", values: colors }, { name: "Lengan", values: ["Pendek", "Panjang"] }, { name: "Ukuran", values: ["S", "M"] }],
    productVariants: variants, defaultVariantSku: variants[0]!.sku,
  };
  if (mode === "legacy") {
    product.productKind = undefined;
    product.variantOptions = [];
    product.productVariants = [];
    product.colorVariantsEnabled = true;
    product.colorVariantsReady = true;
    product.defaultColor = "Coksu";
    product.colorVariants = colors.map((color, index) => ({
      id: 8000 + index, color, sku: `LEGACY-${color}`, imageSrc: color === "Bronze" ? "" : `https://images.example/${color}-Pendek.svg`,
      fabricColor: color === "Bronze" ? "#987654" : undefined, stockQuantity: 20,
    }));
  }
  return <ProductDetail product={product} globalEmbroideryPricing={{ enabled: false, mode: "flat_per_piece", zones: [] }} />;
}
