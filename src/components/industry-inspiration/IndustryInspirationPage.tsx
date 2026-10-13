import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { IndustryBenefitHero } from "./IndustryBenefitHero";
import { IndustryProductSelection } from "./IndustryProductSelection";
import { productServerService } from "@/features/products/product.server-service";
import { getPublicSiteContent } from "@/features/site-content/site-content.service";
import { resolveInspirationPage } from "@/features/site-content/industry-inspiration.content";
import { INSPIRATION_PAGES, type InspirationPage } from "@/features/site-content/industry-inspiration.routes";
import { CafeRestaurantInspiration, type BusinessKind } from "./CafeRestaurantInspiration";

export async function IndustryInspirationPage({ page, initialFoodBusiness }: { page: InspirationPage; initialFoodBusiness?: BusinessKind }) {
  if (page.industry === "F&B") {
    const content = await getPublicSiteContent();
    const inspiration = resolveInspirationPage(page, content.industri);
    return <CafeRestaurantInspiration initialBusiness={initialFoodBusiness} placements={inspiration.cafePlacements} />;
  }

  const [products, content] = await Promise.all([
    productServerService.getProductsByIndustry(page.industry),
    getPublicSiteContent(),
  ]);
  const inspiration = resolveInspirationPage(page, content.industri);
  const sectionId = page.industry === "Bengkel" ? "produk-bengkel" : "pilihan-produk";

  return (
    <main className="bg-[#f8f4ec]">
      <IndustryBenefitHero data={inspiration} presentation={page.industry === "Bengkel" ? "immersive" : "framed"} productSectionId={sectionId} />
      {page.industry === "Corporate" ? (
        <section aria-labelledby="corporate-industries" className="mx-auto max-w-[1440px] px-5 pt-12 sm:px-8 lg:px-12">
          <h2 id="corporate-industries" className="text-2xl font-extrabold tracking-[-0.025em] text-brand-950">Temukan inspirasi untuk bidang perusahaan Anda</h2>
          <nav aria-label="Inspirasi industri korporasi" className="mt-5 flex flex-wrap gap-x-8 gap-y-2">
            {INSPIRATION_PAGES.filter((item) => item.group === "corporate" && item.industry !== "Corporate").map((item) => (
              <Link key={item.slug} href={`/inspirasi/${item.slug}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">{item.label} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            ))}
          </nav>
        </section>
      ) : null}
      <IndustryProductSelection products={products} industry={page.industry} sectionId={sectionId} />
      <nav aria-label="Jelajahi inspirasi lainnya" className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-4 border-t border-ochre-500/40 px-5 py-8 sm:px-8 lg:px-12">
        <Link href="/inspirasi#bisnis-naik-kelas" className="inline-flex min-h-11 items-center gap-3 text-sm font-bold text-brand-950 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">Inspirasi Bisnis Naik Kelas <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        <Link href={page.industry === "Corporate" ? "/inspirasi#solusi-korporasi" : "/inspirasi/solusi-korporasi"} className="inline-flex min-h-11 items-center gap-3 text-sm font-bold text-brand-950 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">Inspirasi Solusi Korporasi <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </nav>
    </main>
  );
}
