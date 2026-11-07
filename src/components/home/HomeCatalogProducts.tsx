import Link from "next/link";
import { CatalogProductCard } from "@/components/catalog/CatalogProductCard";
import { productServerService } from "@/features/products/product.server-service";
import { homepageCatalogProducts } from "@/features/seo/catalog-discovery";

/** Real photos and product links in the initial HTML. */
export async function HomeCatalogProducts() {
  const products = homepageCatalogProducts(await productServerService.getPublishedProducts());
  if (!products.length) return null;
  return <section aria-labelledby="home-catalog-title" className="mx-auto max-w-[1600px] px-6 py-12 lg:px-8">
    <h2 id="home-catalog-title" className="text-2xl font-bold text-brand-950 sm:text-3xl">Pilihan Kemeja Kerja dan Seragam Kerja</h2>
    <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-muted">
      Lihat foto dan detail model untuk membandingkan bahan, pilihan ukuran, serta harga.
      Jelajahi <Link href="/catalog" className="font-semibold underline underline-offset-4">seluruh katalog seragam kerja</Link> untuk menemukan pilihan yang sesuai dengan kebutuhan tim Anda.
    </p>
    <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {products.map(product => <CatalogProductCard key={product.id} product={product} />)}
    </div>
  </section>;
}
