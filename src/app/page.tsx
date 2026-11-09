// src/app/page.tsx — Homepage

import { HomePage } from "@/components/home/HomePage";
import type { Metadata } from "next";
import { serializeJsonLd } from "@/lib/seo";
import { homeMetadata } from "@/features/seo/storefront-metadata";
import { ofissioOrganization } from "@/features/seo/organization-schema";

// Keep homepage sharing metadata here so product links can define their own
// preview instead of inheriting the homepage canonical URL and brand image.
export const metadata: Metadata = homeMetadata;

export default function Page() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd({
      "@context": "https://schema.org", ...ofissioOrganization(),
    }) }} />
    <HomePage />
  </>;
}
