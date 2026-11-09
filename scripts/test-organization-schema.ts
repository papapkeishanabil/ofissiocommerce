import assert from "node:assert/strict";
import { ofissioOrganization, OFISSIO_OFFICIAL_PROFILES } from "../src/features/seo/organization-schema";
import { aboutUsStructuredData } from "../src/features/page-builder/about-us.seo";
import type { PageDocument } from "../src/features/page-builder/page.schema";
import { serializeJsonLd } from "../src/lib/seo";

const organization = ofissioOrganization();
const about = aboutUsStructuredData({ title: "Tentang Ofissio", description: "Tentang Ofissio" } as PageDocument);
assert.deepEqual(about["@graph"][0], organization);
const aboutPage = about["@graph"].find(node => "mainEntity" in node);
assert.ok(aboutPage && "mainEntity" in aboutPage);
assert.equal(aboutPage.mainEntity?.["@id"], organization["@id"]);
assert.equal(organization["@type"], "OnlineStore");
assert.equal(organization.email, "sales@ofissio.com");
assert.equal(organization.address.addressCountry, "ID");
assert.deepEqual(organization.sameAs, [...OFISSIO_OFFICIAL_PROFILES]);
assert.equal(new Set(organization.sameAs).size, 3);
assert.ok(organization.sameAs.every(url => new URL(url).protocol === "https:"));
for (const unverified of ["aggregateRating", "review", "telephone", "legalName", "hasMerchantReturnPolicy", "hasShippingService"]) {
  assert.ok(!(unverified in organization), `Unverified business claims must stay absent: ${unverified}`);
}
assert.deepEqual(JSON.parse(serializeJsonLd(organization)), organization);
console.log("PASS: consistent homepage/About identity, owner-confirmed profiles, public contacts, and no fabricated ratings or policies; no database writes.");
