import { notFound } from "next/navigation";
import { readPublishedPage } from "@/features/page-builder/page.repository";
import { PageRenderer } from "@/features/page-builder/PageRenderer";
import { cache } from "react";
import { aboutUsMetadata, aboutUsStructuredData } from "@/features/page-builder/about-us.seo";
import { serializeJsonLd } from "@/lib/seo";
export const dynamic = "force-dynamic";

// Both metadata and content use the same published snapshot within a request.
const getPublishedAboutUs = cache(() => readPublishedPage("about-us"));

export async function generateMetadata() {
  const document = await getPublishedAboutUs();
  if (!document) notFound();
  return aboutUsMetadata(document);
}

export default async function AboutUsPage() {
  const document = await getPublishedAboutUs();
  if (!document) notFound();
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(aboutUsStructuredData(document)) }} />
    <PageRenderer document={document}/>
  </>;
}
