import { readFileSync } from "node:fs";
import { ProductDetail } from "@/components/product/ProductDetail";
import type { OfissioProduct } from "@/features/products/product.types";
import type { Size } from "@/types/industry";

export default function OrderFieldsVerification() {
  const fixture = JSON.parse(readFileSync(".tmp-variant-fixture.json", "utf8")) as OfissioProduct;
  const sizes: Size[] = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
  const product: OfissioProduct = {
    ...fixture, name: "Kemeja Kantor Wanita SN Basic - Pink-Red Series", colors: ["Apricot", "Salmon"], available_colors: ["Apricot", "Salmon"],
    mainImage: undefined, images: [], priceFrom: 85000, available_sizes: sizes,
    variantOptions: [{ name: "Warna", values: ["Apricot", "Salmon"] }, { name: "Ukuran", values: sizes }],
    productVariants: ["Apricot", "Salmon"].flatMap((color, index) => sizes.map((size, i) => ({ id: 9900 + index * 10 + i, sku: `TEST-${color}-${size}`, options: { Warna: color, Ukuran: size }, imageSrc: "", regularPrice: 85000 }))),
    defaultVariantSku: "TEST-Apricot-XS",
    sizeChart: sizes.map((size, i) => ({ size, chest: 92 + i * 4, length: 68 + i * 2 })),
  };
  return <ProductDetail product={product} globalEmbroideryPricing={{ enabled: false, mode: "flat_per_piece", zones: [] }} sizeChartStandardName="Ukuran kemeja wanita" />;
}
