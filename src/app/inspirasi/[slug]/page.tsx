import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IndustryInspirationPage } from "@/components/industry-inspiration/IndustryInspirationPage";
import { findInspirationPage } from "@/features/site-content/industry-inspiration.routes";
import { resolveInspirationPage } from "@/features/site-content/industry-inspiration.content";
import { getPublicSiteContent } from "@/features/site-content/site-content.service";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = findInspirationPage((await params).slug);
  if (!page) notFound();
  const content = await getPublicSiteContent();
  const data = resolveInspirationPage(page, content.industri);
  return { title: `Inspirasi Seragam ${page.label}`, description: data.lede };
}

export default async function InspirationPage({ params }: Props) {
  const page = findInspirationPage((await params).slug);
  if (!page) notFound();
  return <IndustryInspirationPage page={page} />;
}
