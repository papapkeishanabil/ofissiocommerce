import type { OfissioProduct } from "@/features/products/product.types";
import { validateProductForCatalog } from "@/features/products/product.validation";
import { productImages, productUrl, SITE_URL } from "@/lib/seo";

/** Never advertise mock, unpublished or invalid records to crawlers. */
export function discoverableProducts(products: OfissioProduct[]) {
  const seen = new Set<string>();
  return products.filter(product => {
    if (product.source !== "woocommerce" || !validateProductForCatalog(product).ok || seen.has(product.slug)) return false;
    seen.add(product.slug);
    return true;
  });
}

export function homepageCatalogProducts(products: OfissioProduct[], limit = 4) {
  const eligible = discoverableProducts(products).filter(product => productImages(product).length > 0);
  const result: OfissioProduct[] = [], categories = new Set<string>();
  for (const product of eligible) {
    if (result.length >= limit) break;
    if (!categories.has(product.category)) { result.push(product); categories.add(product.category); }
  }
  for (const product of eligible) {
    if (result.length >= limit) break;
    if (!result.includes(product)) result.push(product);
  }
  return result;
}

export function catalogCollectionSchema(products: OfissioProduct[], collection?: {name:string;url:string}) {
  const records = discoverableProducts(products);
  if (!records.length) return null;
  return {
    "@context": "https://schema.org", "@type": "CollectionPage",
    "@id": `${collection?.url??`${SITE_URL}/catalog`}#collection`, url: collection?.url??`${SITE_URL}/catalog`,
    name: collection?.name??"Kemeja Kerja dan Seragam Kerja",
    mainEntity: {
      "@type": "ItemList", numberOfItems: records.length,
      itemListElement: records.map((product, index) => ({
        "@type": "ListItem", position: index + 1, url: productUrl(product.slug),
        name: product.name, ...(productImages(product).length ? { image: productImages(product)[0] } : {}),
      })),
    },
  };
}
