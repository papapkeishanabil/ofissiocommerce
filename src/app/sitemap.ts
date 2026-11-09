import type { MetadataRoute } from "next";
import { productServerService } from "@/features/products/product.server-service";
import { validateProductForCatalog } from "@/features/products/product.validation";
import { SITE_URL, productUrl, productImages } from "@/lib/seo";
import { INSPIRATION_PAGES } from "@/features/site-content/industry-inspiration.routes";

import { readPublishedPage } from "@/features/page-builder/page.repository";
import { ABOUT_US_URL } from "@/features/page-builder/about-us.seo";
import { listCatalogCategories } from "@/features/catalog-taxonomy/catalog-taxonomy.service";
import { catalogCategoryLandings } from "@/features/seo/catalog-category-landing";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, aboutUs, categories] = await Promise.all([productServerService.getPublishedProducts(), readPublishedPage("about-us"), listCatalogCategories().catch(()=>[])]);
  const urls = [SITE_URL, `${SITE_URL}/catalog`, `${SITE_URL}/inspirasi`, `${SITE_URL}/faq`, `${SITE_URL}/panduan/memilih-kemeja-seragam-kerja`,
    ...(aboutUs ? [ABOUT_US_URL] : []),
    ...INSPIRATION_PAGES.map(page => `${SITE_URL}/inspirasi/${page.slug}`),
    ...products.filter(product => product.source === "woocommerce" && validateProductForCatalog(product).ok)
      .map(product => productUrl(product.slug))];
  // No fabricated lastModified dates and no account/filter URLs.
  const imagesByUrl = new Map(products.filter(product => product.source === "woocommerce" && validateProductForCatalog(product).ok)
    .map(product => [productUrl(product.slug), productImages(product)]));
  const landings=catalogCategoryLandings(categories,products);
  for(const landing of landings)imagesByUrl.set(landing.url,[...new Set(landing.products.flatMap(product=>productImages(product).slice(0,1)))]);
  return [...new Set([...urls,...landings.map(landing=>landing.url)])].map(url => ({ url, ...(imagesByUrl.get(url)?.length ? { images: imagesByUrl.get(url) } : {}) }));
}
