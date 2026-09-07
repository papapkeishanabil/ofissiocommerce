import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main(){
  const batchId=process.argv[2];
  if(!batchId)throw new Error("batchId required");
  const [{productImportRepository},{woocommerceClient}]=await Promise.all([
    import("../src/features/product-import/product-import.repository"),
    import("../src/features/products/woocommerce/woocommerce.client"),
  ]);
  const item=(await productImportRepository.listItems(batchId)).find((candidate)=>String(candidate.source_id)==="10404");
  if(!item?.target_product_id)throw new Error("Source parent 10404 has no target product");
  const product=await woocommerceClient.getProductById(String(item.target_product_id));
  console.log(JSON.stringify({readOnly:true,batchId,sourceParentId:String(item.source_id),wooProductId:product.id,product:product.name,currentSku:product.sku,status:product.status,variationCount:product.variations?.length??0,imageIds:(product.images??[]).map((image)=>image.id)},null,2));
}
main().catch((error)=>{console.error(error);process.exitCode=1;});
