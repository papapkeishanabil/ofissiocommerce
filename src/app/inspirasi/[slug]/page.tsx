import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IndustryInspirationPage } from "@/components/industry-inspiration/IndustryInspirationPage";
import { findInspirationPage } from "@/features/site-content/industry-inspiration.routes";
import { resolveInspirationPage } from "@/features/site-content/industry-inspiration.content";
import { getPublicSiteContent } from "@/features/site-content/site-content.service";
import { industryPageMetadata } from "@/features/seo/industry-metadata";

export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ business?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = findInspirationPage((await params).slug);
  if (!page) notFound();
  const content = await getPublicSiteContent();
  const data = resolveInspirationPage(page, content.industri);
  return industryPageMetadata(data);
}

export default async function InspirationPage({ params, searchParams }: Props) {
  const page = findInspirationPage((await params).slug);
  if (!page) notFound();
  const requestedBusiness = (await searchParams).business;
  const initialFoodBusiness = requestedBusiness === "restaurant" ? "restaurant" : "cafe";
  return <IndustryInspirationPage page={page} initialFoodBusiness={initialFoodBusiness} />;
}
