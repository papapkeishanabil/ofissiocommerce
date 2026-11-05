import { homeMetadata } from "@/features/seo/storefront-metadata";
// src/app/page.tsx — Homepage

import { HomePage } from "@/components/home/HomePage";
import type { Metadata } from "next";
import { SITE_URL, serializeJsonLd } from "@/lib/seo";

// Keep homepage sharing metadata here so product links can define their own
// preview instead of inheriting the homepage canonical URL and brand image.
export const metadata: Metadata = homeMetadata;

export default function Page() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd({
      "@context": "https://schema.org", "@type": "Organization",
      "@id": `${SITE_URL}/#organization`, name: "Ofissio", url: SITE_URL,
    }) }} />
    <HomePage />
  </>;
}
