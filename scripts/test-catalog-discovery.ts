import assert from "node:assert/strict";
import { PRODUCT_MOCK_DATA } from "../src/features/products/product.mock-data";
import { catalogCollectionSchema, discoverableProducts, homepageCatalogProducts } from "../src/features/seo/catalog-discovery";
import { validateProductForCatalog } from "../src/features/products/product.validation";
import { serializeJsonLd } from "../src/lib/seo";

const first = { ...PRODUCT_MOCK_DATA.find(product => product.status === "published")!, source: "woocommerce" as const,
  mainImage: "https://ofissio.com/test-product.jpg", images: [{id:1,name:"Test product",src:"https://ofissio.com/test-product.jpg",alt:"Test product"}] };
assert(validateProductForCatalog(first).ok, JSON.stringify(validateProductForCatalog(first)));
const second = { ...first, id: "second", slug: "model-second", category: "Lapangan" };
const third = { ...first, id: "third", slug: "model-third" };
const unpublished = { ...first, id: "draft", slug: "draft", status: "draft" as const };
const input = [first, second, third, first, unpublished, { ...first, source: "mock" as const }];
assert.equal(discoverableProducts(input).length, 3);
assert.equal(homepageCatalogProducts(input, 2).length, 2);
assert.equal(homepageCatalogProducts(input, 2)[1]?.slug, second.slug);
assert.deepEqual(homepageCatalogProducts(input, 0), []);
const schema = catalogCollectionSchema(input)!;
assert.equal(schema.mainEntity.numberOfItems, 3);
assert.deepEqual(schema.mainEntity.itemListElement.map(item => item.position), [1, 2, 3]);
assert.equal(schema.mainEntity.itemListElement[0]?.url, `https://ofissio.com/product/${first.slug}`);
assert.equal(catalogCollectionSchema([]), null);
assert(!serializeJsonLd({ name: "</script>" }).includes("</script>"));
console.log("PASS: real published products only, unique canonical links, bounded homepage selection, category diversity, accurate collection schema and safe serialization.");
