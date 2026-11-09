import type { OfissioProduct } from "@/features/products/product.types";
import type { Industry } from "@/types/industry";
import { INSPIRATION_ROUTES } from "@/features/site-content/industry-inspiration.routes";
import { SITE_URL, productUrl } from "@/lib/seo";

/** Describe only the cards actually rendered, not every product in the industry. */
export function industryCollectionSchema(industry: Industry, displayed: OfissioProduct[], description: string) {
  const route = INSPIRATION_ROUTES[industry];
  const url = `${SITE_URL}/inspirasi/${route.slug}`;
  const seen = new Set<string>();
  const products = displayed.filter(product => {
    if (product.source !== "woocommerce" || product.status !== "published" || !product.slug || seen.has(product.slug)) return false;
    seen.add(product.slug);
    return true;
  });
  if (!products.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`, url,
    name: `Pilihan seragam ${route.label}`,
    description,
    inLanguage: "id-ID",
    relatedLink: `${SITE_URL}/catalog?industri=${encodeURIComponent(industry)}`,
    mainEntity: {
      "@type": "ItemList", numberOfItems: products.length,
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem", position: index + 1,
        name: product.name, url: productUrl(product.slug),
      })),
    },
  };
}
