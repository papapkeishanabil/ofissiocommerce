import assert from "node:assert/strict";
import { PRODUCT_MOCK_DATA } from "../src/features/products/product.mock-data";
import { productImages, productStructuredData, productUrl, serializeJsonLd } from "../src/lib/seo";
import robots from "../src/app/robots";
import sitemap from "../src/app/sitemap";
import { productServerService } from "../src/features/products/product.server-service";

async function main() {
  const mock = PRODUCT_MOCK_DATA[0];
  assert.ok(mock);
  assert.equal(productStructuredData(mock), null);
  const product = { ...mock, source: "woocommerce" as const, name: "</script><script>alert(1)</script>",
    mainImage: "/product.jpg", images: [{ id: 1, src: "javascript:alert(1)", name: "", alt: "" }] };
  const data = productStructuredData(product)!;
  const serialized = serializeJsonLd(data);
  assert.ok(!serialized.includes("</script>"));
  assert.equal(JSON.parse(serialized)["@graph"][0].name, product.name);
  assert.deepEqual(productImages(product), ["https://ofissio.com/product.jpg"]);
  const productNode = data["@graph"][0];
  assert.ok(productNode);
  assert.ok(!("offers" in productNode));
  assert.equal(productUrl("a/b"), "https://ofissio.com/product/a%2Fb");
  assert.equal(robots().sitemap, "https://ofissio.com/sitemap.xml");

  const original = productServerService.getPublishedProducts;
  try {
    // A source outage may return mocks; these must not leak into the sitemap.
    productServerService.getPublishedProducts = async () => PRODUCT_MOCK_DATA;
    const entries = await sitemap();
    assert.ok(entries.length > 3);
    assert.ok(entries.every(entry => !entry.url.includes("/product/")));
    assert.ok(entries.every(entry => !entry.lastModified));
  } finally { productServerService.getPublishedProducts = original; }
  console.log("GEO checks passed: safe JSON-LD, mock exclusion, URLs, images and crawler sitemap.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
