import type { MetadataRoute } from "next";
import { productServerService } from "@/features/products/product.server-service";
import { validateProductForCatalog } from "@/features/products/product.validation";
import { SITE_URL, productUrl } from "@/lib/seo";
import { INSPIRATION_PAGES } from "@/features/site-content/industry-inspiration.routes";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await productServerService.getPublishedProducts();
  const urls = [SITE_URL, `${SITE_URL}/catalog`, `${SITE_URL}/inspirasi`,
    ...INSPIRATION_PAGES.map(page => `${SITE_URL}/inspirasi/${page.slug}`),
    ...products.filter(product => product.source === "woocommerce" && validateProductForCatalog(product).ok)
      .map(product => productUrl(product.slug))];
  // No fabricated lastModified dates and no account/filter URLs.
  return [...new Set(urls)].map(url => ({ url }));
}
