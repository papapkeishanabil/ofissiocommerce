import assert from "node:assert/strict";
import { PRODUCT_MOCK_DATA } from "../src/features/products/product.mock-data";
import { productStructuredData } from "../src/lib/seo";
import type { ProductSeoInput } from "../src/features/seo/product-automatic-seo";
const product={...PRODUCT_MOCK_DATA[0]!,source:"woocommerce" as const,status:"published" as const,sleeve_type:"short" as const,
  priceFrom:125000,liveOfferPrice:125000,moq:1,stockVariantsReady:true,transaction_mode:"HYBRID" as const,quantityPricing:undefined};
const source:ProductSeoInput={name:"Kemeja Kerja Uji",modelCode:"KK-012",description:"",materials:["American Drill"],colors:["Navy"],sleeves:["short","LENGAN PENDEK","LENGAN PANJANG"]};
function schema(sleeves:string[]){return productStructuredData({...product,seoInput:{...source,sleeves}})!["@graph"][0]!;}
function sleeve(sleeves:string[]){const node=schema(sleeves);return 'additionalProperty' in node?node.additionalProperty?.find(item=>item.name==='Tipe lengan')?.value:undefined;}
assert.equal(sleeve(source.sleeves),undefined);
assert.equal(sleeve([]),undefined);
assert.equal(sleeve(["short","unknown"]),undefined);
assert.equal(sleeve(["long","LENGAN PANJANG"]),"Lengan panjang");
assert.equal(sleeve(["short","Lengan Pendek"]),"Lengan pendek");
const mixed=schema(source.sleeves),single=schema(["short"]);
assert('offers' in mixed&&'offers' in single);assert.deepEqual(mixed.offers,single.offers);
assert.equal(mixed.name,single.name);assert.deepEqual(mixed.image,single.image);
console.log("PASS: mixed, missing and unknown sleeve evidence omitted; unambiguous sleeve retained; name, images and offers unaffected.");
