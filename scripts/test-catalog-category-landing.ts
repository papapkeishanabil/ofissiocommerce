import assert from "node:assert/strict";
import { PRODUCT_MOCK_DATA } from "../src/features/products/product.mock-data";
import { catalogCategoryLandings, findCategoryLanding, singleCategoryInput } from "../src/features/seo/catalog-category-landing";
import { catalogCollectionSchema } from "../src/features/seo/catalog-discovery";
import { effectivePageSeo, automaticPageSeo } from "../src/features/seo/page-seo";
const product={...PRODUCT_MOCK_DATA.find(product=>product.status==="published")!,source:"woocommerce" as const,
 mainImage:"https://ofissio.com/test-image.jpg",images:[{id:1,name:"Test",src:"https://ofissio.com/test-image.jpg",alt:"Test"}],category:"Kemeja Kerja Kombinasi",categorySlugs:["kombinasi","kemeja-lapangan"]};
const manual={title:"Pilihan tim untuk lapangan | OFISSIO",description:"Deskripsi tim."};
const categories=[{name:"Kemeja Lapangan",slug:"kemeja-lapangan",active:true,description:"",seo:{...manual,primaryKeyword:"",relatedKeywords:[]}},
 {name:"Kategori Kosong",slug:"kosong",active:true,description:""},
 {name:"Kombinasi Nonaktif",slug:"kombinasi",active:false,description:""}];
const landings=catalogCategoryLandings(categories,[product,{...product,source:"mock"},{...product,status:"draft"}]);
assert.equal(landings.length,1);const landing=landings[0]!;
assert.equal(landing.products.length,1);assert.equal(landing.heading,"Kemeja Lapangan");
assert.equal(landing.url,"https://ofissio.com/catalog?kategori=kemeja-lapangan");
assert(landing.intro.includes("1 model kemeja lapangan"));
assert.equal(findCategoryLanding(landings,"Kemeja Lapangan"),landing);
for(const extra of [{warna:"biru"},{industri:"bengkel"},{q:"lapangan"}])assert.equal(singleCategoryInput({kategori:"kemeja-lapangan",...extra}),undefined);
assert.equal(singleCategoryInput({category:"kemeja-lapangan"}),"kemeja-lapangan");
assert.deepEqual(effectivePageSeo(landing.category.seo,automaticPageSeo(landing.category.name,landing.intro)),manual);
const schema=catalogCollectionSchema(landing.products,{name:landing.heading,url:landing.url})!;
assert.equal(schema.url,landing.url);assert.equal(schema.name,landing.heading);assert.equal(schema.mainEntity.numberOfItems,1);
console.log("PASS: populated active categories only, second-category assignments, no mock/draft leakage, stable existing URLs, facet isolation, manual SEO priority, accurate category schema.");
