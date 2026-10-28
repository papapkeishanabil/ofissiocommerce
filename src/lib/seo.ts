import type { OfissioProduct } from "@/features/products/product.types";

export const SITE_URL = "https://ofissio.com";
export const productUrl = (slug: string) => `${SITE_URL}/product/${encodeURIComponent(slug)}`;

export function publicImageUrl(value: string): string | undefined {
  try {
    const url = new URL(value, SITE_URL);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch { return undefined; }
}

export function productImages(product: OfissioProduct) {
  return [...new Set([product.mainImage, ...(product.images ?? []).map(image => image.src)]
    .filter((src): src is string => Boolean(src))
    .map(publicImageUrl).filter((src): src is string => Boolean(src)))];
}

export function productStructuredData(product: OfissioProduct) {
  // Mock fallback data must never be represented as a real merchant product.
  if (product.source !== "woocommerce") return null;
  const url = productUrl(product.slug);
  const sizes = [...new Set((product.available_sizes ?? []).map(value => value.trim()).filter(Boolean))];
  const colors = [...new Set((product.available_colors ?? []).map(value => value.trim()).filter(value => value && value.toLowerCase() !== "default"))];
  const suggestedGender = product.gender === "men" ? "male" : product.gender === "women" ? "female" : product.gender === "unisex" ? "unisex" : undefined;
  const sleeve = product.sleeve_type === "long" ? "Lengan panjang" : product.sleeve_type === "short" ? "Lengan pendek" : undefined;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product", "@id": `${url}#product`, url,
        name: product.name, description: product.description,
        sku: product.sku, image: productImages(product),
        brand: { "@type": "Brand", name: "Ofissio" },
        ...(product.material ? { material: product.material } : {}),
        ...(sizes.length ? { size: sizes } : {}),
        ...(colors.length ? { color: colors } : {}),
        ...(suggestedGender ? { audience: { "@type": "PeopleAudience", suggestedGender } } : {}),
        ...(sleeve ? { additionalProperty: [{ "@type": "PropertyValue", name: "Tipe lengan", value: sleeve }] } : {}),
        // Offers are deliberately omitted until per-variant price and stock
        // can be guaranteed to match the purchasable selection on this page.
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ofissio", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Katalog Produk", item: `${SITE_URL}/catalog` },
          { "@type": "ListItem", position: 3, name: product.name, item: url },
        ],
      },
    ],
  };
}

export const serializeJsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
