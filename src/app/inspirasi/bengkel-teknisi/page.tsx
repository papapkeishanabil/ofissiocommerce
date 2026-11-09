import type { Metadata } from "next";

import { IndustryInspirationPage } from "@/components/industry-inspiration/IndustryInspirationPage";
import { INSPIRATION_ROUTES } from "@/features/site-content/industry-inspiration.routes";
import { getPublicSiteContent } from "@/features/site-content/site-content.service";
import { resolveInspirationPage } from "@/features/site-content/industry-inspiration.content";
import { industryPageMetadata } from "@/features/seo/industry-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPublicSiteContent();
  return industryPageMetadata(resolveInspirationPage({ industry: "Bengkel", ...INSPIRATION_ROUTES.Bengkel }, content.industri));
}

export default async function BengkelTeknisiInspirationPage() {
  return <IndustryInspirationPage page={{ industry: "Bengkel", ...INSPIRATION_ROUTES.Bengkel }} />;
}
