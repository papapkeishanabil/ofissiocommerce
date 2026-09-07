import { woocommerceClient } from "../src/features/products/woocommerce/woocommerce.client";
import { getRawVariationSkus } from "../src/features/products/woocommerce/woocommerce-raw-variation.service";

async function main(){
const sku = (process.argv[2] ?? "").trim();
if (!sku) throw new Error("Usage: tsx scripts/diagnose-woo-variation-repair.ts <parent-sku>");
const products = await woocommerceClient.getProducts({ sku, status: "any", per_page: 10 });
const product = products.find((candidate) => candidate.sku.trim().toUpperCase() === sku.toUpperCase());
if (!product) throw new Error(`Product ${sku} tidak ditemukan.`);
const variations = await woocommerceClient.getProductVariations(product.id, { per_page: 100 });
const rawById=new Map((await getRawVariationSkus(product.id)).map(item=>[item.variationId,item]));
console.log(JSON.stringify({
  parentWooId: product.id,
  parentSku: product.sku,
  variationCount: variations.length,
  variations: variations.map((variation) => {const raw=rawById.get(variation.id);const size=(variation.attributes??[]).map(attribute=>attribute.option).join(" / ");return{
    variationId: variation.id,
    size,
    displaySku:raw?.displaySku??variation.sku??"",
    rawSku:raw?.rawSku??null,
    inheritedFromParent:raw?.inheritedFromParent??null,
    expectedRawSku:"",
    rawSkuMatches:raw?.rawSku==="",
    currentAttributes: (variation.attributes??[]).map((attribute) => ({ name: attribute.name ?? String(attribute.id ?? ""), option: attribute.option })),
    attributeMatches:Boolean(size),
    regularPrice: variation.regular_price ?? "",
    salePrice: variation.sale_price ?? "",
    priceMatches:null,
  }}),
}, null, 2));
}
main().catch((error)=>{console.error(error instanceof Error?error.message:"Diagnostic failed.");process.exitCode=1;});
