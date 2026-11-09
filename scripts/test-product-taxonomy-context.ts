import assert from "node:assert/strict";
import { PRODUCT_MOCK_DATA } from "../src/features/products/product.mock-data";
import { industryLabel } from "../src/features/catalog-taxonomy/industry-labels";
import { productTaxonomyContext } from "../src/features/seo/product-taxonomy-context";
import { matchStorefrontCatalogProducts } from "../src/features/catalog-taxonomy/catalog-broad-search";
import { normalizeCatalogSearch } from "../src/features/catalog-taxonomy/catalog-search";
import { DEFAULT_PUBLIC_TAXONOMY } from "../src/features/catalog-taxonomy/catalog-taxonomy.defaults";
const sample={...PRODUCT_MOCK_DATA[0]!,name:"Kemeja Kerja KT-003",categories:[
  {id:1,name:"Kemeja Kerja Kombinasi",slug:"kemeja-kerja-kombinasi"},
  {id:2,name:"Kemeja Lapangan",slug:"kemeja-lapangan"}],
  industrySlugs:["corporate","hospitality","education","healthcare","construction","logistics","grosir","bengkel","laundry","sparepart","bangunan","manufacturing","retail","food-beverage"]};
const context=productTaxonomyContext(sample);
assert.equal(context.categories.length,2);assert.equal(context.categories[1]?.name,"Kemeja Lapangan");
assert.equal(context.industries.length,14);
assert.equal(context.industries.find(i=>i.slug==="corporate")?.name,"Perkantoran dan Perusahaan");
assert.equal(context.industries.find(i=>i.slug==="sparepart")?.name,"Toko Suku Cadang");
assert.equal(context.industries.find(i=>i.slug==="grosir")?.name,"Toko Grosir dan Distributor");
assert.equal(context.industries.find(i=>i.slug==="bengkel")?.href,"/inspirasi/bengkel-teknisi");
assert.equal(industryLabel("food-beverage","Food & Beverage"),"Makanan dan Minuman");
assert.equal(industryLabel("corporate","Perusahaan dan Instansi Pilihan Tim"),"Perusahaan dan Instansi Pilihan Tim");
assert.equal(industryLabel("new-industry","Bidang Khusus Tim"),"Bidang Khusus Tim");
assert.equal(productTaxonomyContext(sample,[{slug:"bengkel",name:"Bengkel",active:false}]).industries.length,13);
assert.equal(productTaxonomyContext({...sample,industrySlugs:["bengkel","bengkel"]}).industries.length,1);
assert.equal(productTaxonomyContext({...sample,industries:["Corporate"],industrySlugs:[]}).industries[0]?.slug,"corporate");
assert(!JSON.stringify(context).includes("keywords"));
const taxonomy={...DEFAULT_PUBLIC_TAXONOMY,categories:[
  {name:"Kemeja Kerja Polos",slug:"kemeja-kerja-polos",synonyms:["kemeja"]},
  {name:"Kemeja Lapangan",slug:"kemeja-lapangan",synonyms:["kemeja lapangan"]},
]};
const searchable={...sample,category:"Kemeja Kerja Kombinasi",categorySlugs:["kemeja-kerja-kombinasi","kemeja-lapangan"]};
for(const query of ["kemeja bengkel","seragam grosir","baju grosir","kemeja lapangan"]){
  assert(matchStorefrontCatalogProducts([searchable],query,normalizeCatalogSearch(query,taxonomy),taxonomy).length===1,query);
}
const notField={...searchable,categorySlugs:["kemeja-kerja-kombinasi"]};
assert.equal(matchStorefrontCatalogProducts([notField],"kemeja lapangan",normalizeCatalogSearch("kemeja lapangan",taxonomy),taxonomy).length,0);
console.log("PASS: all assigned categories/industries, Indonesian labels, stable slugs, custom-name protection, inactive industry exclusion, no fabricated wholesale offer or meta keywords.");
