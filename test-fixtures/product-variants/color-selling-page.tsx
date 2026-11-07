import { AdminProductForm } from "@/features/products/components/AdminProductForm";
import { ProductDetail } from "@/components/product/ProductDetail";
import { CatalogProductCard } from "@/components/catalog/CatalogProductCard";
import { mapWooCommerceProductToOfissioProduct } from "@/features/products/product.mapper";
import { getProductReadiness } from "@/features/products/woocommerce/woocommerce-product-readiness";
import type { AdminWooCommerceProductDetail } from "@/features/products/woocommerce/woocommerce-product-admin.types";
import { INACTIVE_PRODUCT_COLORS_META } from "@/features/products/product-color-selling";
import { colorSellingFixture } from "./color-selling-fixture";
import "@/app/catalog.css";

export function colorSellingAdminFixture(inactiveColors: string[], legacy: boolean): AdminWooCommerceProductDetail {
  const { product: raw, options, variants } = colorSellingFixture();
  return {
    id: raw.id, name: raw.name, slug: raw.slug, sku: raw.sku, price: 85000, status: "publish", categories: raw.categories ?? [], industries: ["office"], primaryImage: { ...raw.images![0]!, name: "Apricot", alt: "Apricot" },
    readiness: getProductReadiness(raw), wooEditUrl: null, inactiveColors, productKind: legacy ? undefined : "variable", modelCode: "SN", variantOptions: options,
    productVariants: variants, defaultVariantSku: variants[0]!.sku, defaultColor: "Apricot", colorVariantsEnabled: legacy, colorVariantsReady: true, colorSizeVariantsEnabled: legacy,
    colorVariants: ["Apricot", "Pink"].map((color, index) => ({ id: 100 + index * 2, color, sku: `SN-${color.toUpperCase()}`, imageSrc: raw.images![index]!.src, stockQuantity: null })),
    description: raw.description ?? "", shortDescription: raw.short_description ?? "", weightGram: 250, lengthCm: 30, widthCm: 20, heightCm: 3,
    imageCount: 2, imageUrls: raw.images!.map(image => image.src), images: raw.images!.map(image => ({ id: image.id, src: image.src, name: image.name || "", alt: image.alt || "" })),
    attributes: raw.attributes!.map(attribute => ({ name: attribute.name, slug: attribute.slug || "", options: attribute.options || [] })),
    ofissioMeta: {
      has3DModel: false, model3DUrl: "", model3DStorageBucket: "", model3DStorageKey: "", model3DId: "", model3DVersion: "", model3DSource: "", model3DFilename: "", model3DUpdatedAt: "",
      moq: 1, leadTime: "3 hari", fulfillmentType: "ready_stock", transactionMode: "direct_checkout", supportsEmbroidery: true, supportsScreenPrinting: false, supportsDtf: false, embroideryZones: ["left_chest"],
      hasLegacyEmbroideryPricing: false, alwaysOrderable: true, replenishmentPolicy: "internal_warning_only", processRoute: "fulfillment", gender: "women", sleeveType: "long", safetyFeatures: [],
      quantityPricingEnabled: false, quantityPricingMode: "fixed_unit_price", quantityBasis: "total_order_qty", quantityPricingTiers: [],
    },
  };
}

export default async function ColorSellingVerification({ searchParams }: { searchParams: Promise<{ view?: string; inactive?: string; legacy?: string }> }) {
  const { view, inactive, legacy } = await searchParams;
  const inactiveColors = inactive === "all" ? ["Apricot", "Pink"] : inactive === "apricot" ? ["Apricot"] : [];
  const { product: raw } = colorSellingFixture();
  raw.meta_data!.push({ key: INACTIVE_PRODUCT_COLORS_META, value: JSON.stringify(inactiveColors) });
  const product = mapWooCommerceProductToOfissioProduct(raw);
  if (view === "detail") return <ProductDetail product={product} globalEmbroideryPricing={{ enabled: false, mode: "flat_per_piece", zones: [] }} initialVariantSku="SN-APRICOT-S" />;
  if (view === "card") return <div className="max-w-sm p-4"><CatalogProductCard product={product} /></div>;
  return <div className="mx-auto max-w-6xl p-4"><AdminProductForm mode="edit" product={colorSellingAdminFixture(inactiveColors, legacy === "1")} options={{
    categories: [{ id: 1, name: "Kemeja", slug: "kemeja", active: true, description: "", productCount: 1, synonyms: [], source: "woocommerce" }],
    industries: [{ id: "office", name: "Corporate", slug: "office", active: true, description: "", synonyms: [], sortOrder: 1, createdAt: "", updatedAt: "" }], attributes: [],
  }} /></div>;
}
