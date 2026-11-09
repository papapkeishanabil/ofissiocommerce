import { SITE_URL } from "@/lib/seo";

/** Owner-confirmed store/profile identities, not individual product or review URLs. */
export const OFISSIO_OFFICIAL_PROFILES = [
  "https://shopee.co.id/bajukerjaofissio",
  "https://www.tiktok.com/@ofissio",
  "https://tk.tokopedia.com/ZSpFhgJNu/",
] as const;

/** Keep homepage and AboutPage attached to the same verified business identity. */
export function ofissioOrganization() {
  return {
    "@type": "OnlineStore",
    "@id": `${SITE_URL}/#organization`,
    name: "Ofissio",
    alternateName: "Ofissio Workwear",
    url: SITE_URL,
    logo: `${SITE_URL}/brand/ofissio.png`,
    description: "Workwear Ready Stock & Bordir Logo untuk pengadaan seragam perusahaan di Indonesia.",
    email: "sales@ofissio.com",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Kabupaten Bandung",
      addressCountry: "ID",
    },
    sameAs: [...OFISSIO_OFFICIAL_PROFILES],
  };
}
