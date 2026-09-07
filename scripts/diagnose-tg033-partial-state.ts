import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const SOURCES = ["jaket-TG-033-2-3", "TG-033-navy-1-1", "TG-033-hitam-1-1"];
const SOURCE_URLS = [
  "https://www.ofissio.com/wp-content/uploads/2020/03/jaket-TG-033-2-3.jpg",
  "https://www.ofissio.com/wp-content/uploads/2020/03/TG-033-navy-1-1.jpg",
  "https://www.ofissio.com/wp-content/uploads/2020/03/TG-033-hitam-1-1.jpg",
];

async function main() {
  const [{ woocommerceClient }, { findWordPressMediaBySearch }, { reconcileLegacyMediaState }] = await Promise.all([
    import("../src/features/products/woocommerce/woocommerce.client"),
    import("../src/features/products/woocommerce/wordpress-media-upload.service"),
    import("../src/features/product-integrity-repair/product-integrity-repair.service"),
  ]);
  const product = await woocommerceClient.getProductById(65);
  const matches:Array<{identity:string;sourceUrl:string;media:Array<{id:number;sourceUrl:string;alt:string;title:string}>}>=[];
  for (const identity of SOURCES) {
    const media = await findWordPressMediaBySearch(identity);
    matches.push({ identity, sourceUrl:SOURCE_URLS[matches.length]!, media });
  }
  const productImageIds = (product.images ?? []).map((image) => image.id).filter((id):id is number => Number.isInteger(id));
  const reconciliation=reconcileLegacyMediaState({sourceUrls:SOURCE_URLS,productImages:product.images??[],mediaMatches:matches.map((match)=>({url:match.sourceUrl,media:match.media}))});
  console.log(JSON.stringify({ sku:product.sku, wooProductId:product.id, productImageIds, productImageCount:productImageIds.length, mediaMatches:matches.map((match)=>({...match,media:match.media.map((item)=>({id:item.id,sourceUrl:item.sourceUrl,title:item.title}))})), media844Attached:productImageIds.includes(844), media845Attached:productImageIds.includes(845), allExpectedIdentitiesPresent:SOURCES.every((identity) => matches.some((match) => match.identity === identity && match.media.some((item) => productImageIds.includes(item.id)))), reconciliation,classification:reconciliation.state==="ALREADY_HEALTHY"?"ALREADY_HEALTHY":reconciliation.deterministic?"AUTO_REPAIRABLE":"BLOCKED",writes:{woo:0,media:0,attachments:0,deletes:0} }, null, 2));
}
main().catch((error)=>{console.error(error);process.exitCode=1;});
