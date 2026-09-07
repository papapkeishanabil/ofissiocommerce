import { HeroCarousel } from "./HeroCarousel";
import { getPublicSiteContent } from "@/features/site-content/site-content.service";
import { getPromotionDisplay } from "@/features/promotions/promotion.service";
import type { HeroSlide, TrustStat } from "@/features/site-content/content.schema";

// Hero is now a full-content carousel (rotating slides + dots + arrows). Kept
// as a thin async server wrapper so HomePage's <HeroIntro/> call site is
// unchanged: it reads the admin-editable hero slides from the (cached, tagged)
// site-content service and hands them to the client carousel as a prop.
export async function HeroIntro({ trustItems }: { trustItems: TrustStat[] }) {
  const content = await getPublicSiteContent();
  const slides = await Promise.all(content.hero.slides.map(async (slide) => {
    if (slide.panel.type !== "promo") return slide;
    try {
      const promotion = await getPromotionDisplay(slide.panel.code);
      if (!promotion) return null;
      return { ...slide, panel: { ...slide.panel, code: promotion.code, off: promotion.offer, validity: promotion.validity } };
    } catch {
      return slide;
    }
  })).then((items) => items.filter((slide): slide is HeroSlide => slide !== null));
  return <HeroCarousel slides={slides} trustItems={trustItems} videoSrc={content.hero.videoSrc} />;
}
