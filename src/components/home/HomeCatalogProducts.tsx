import Link from "next/link";
import { CatalogProductCard } from "@/components/catalog/CatalogProductCard";
import { productServerService } from "@/features/products/product.server-service";
import { homepageCatalogProducts } from "@/features/seo/catalog-discovery";
import { listCatalogCategories } from "@/features/catalog-taxonomy/catalog-taxonomy.service";
import { catalogCategoryLandings, catalogCategoryPath } from "@/features/seo/catalog-category-landing";

/** Real photos and product links in the initial HTML. */
export async function HomeCatalogProducts() {
  const [catalog,categories]=await Promise.all([productServerService.getPublishedProducts(),listCatalogCategories().catch(()=>[])]);
  const products = homepageCatalogProducts(catalog);
  const landings=catalogCategoryLandings(categories,catalog);
  if (!products.length) return null;
  return <section aria-labelledby="home-catalog-title" className="mx-auto max-w-[1600px] px-6 py-12 lg:px-8">
    <h2 id="home-catalog-title" className="text-2xl font-bold text-brand-950 sm:text-3xl">Pilihan Kemeja Kerja dan Seragam Kerja</h2>
    <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-muted">
      Lihat foto dan detail model untuk membandingkan bahan, pilihan ukuran, serta harga.
      Jelajahi <Link href="/catalog" className="font-semibold underline underline-offset-4">seluruh katalog seragam kerja</Link> untuk menemukan pilihan yang sesuai dengan kebutuhan tim Anda.
    </p>
    {/* Query-specific category metadata must arrive with the complete document. */}
    {landings.length>0&&<nav aria-label="Pilihan kategori seragam" className="mt-5 flex flex-wrap gap-3">{landings.map(item=><a key={item.category.slug} href={catalogCategoryPath(item.category.slug)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-brand-700 underline underline-offset-4 hover:bg-brand-50">{item.category.name}</a>)}</nav>}
    <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {products.map(product => <CatalogProductCard key={product.id} product={product} />)}
    </div>
  </section>;
}
