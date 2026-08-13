import { HeroCarousel } from "./HeroCarousel";

// Hero is now a full-content carousel (rotating slides + dots + arrows).
// Kept as a thin server wrapper so HomePage's <HeroIntro/> import is unchanged.
export function HeroIntro() {
  return <HeroCarousel />;
}
