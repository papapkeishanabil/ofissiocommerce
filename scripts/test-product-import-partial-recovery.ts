import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { assessPartialImportProduct } from "../src/features/product-import/product-import-partial-recovery";
import type { WooCommerceProduct } from "../src/features/products/woocommerce/woocommerce.types";

async function main(){
const batch={id:"batch-1",created_at:"2026-08-20T03:48:53.194Z",completed_at:"2026-08-20T07:39:32.370Z"};
const item={source_id:"7819",target_sku:"KK-014",action:"CREATE_DRAFT",status:"FAILED",metadata:{name:"Kemeja Kantor KK-014",variationCount:6,imageCount:7}};
const planned={sourceId:"7819",targetSku:"KK-014",name:"Kemeja Kantor KK-014",variationCount:6,imageCount:7};
const product:WooCommerceProduct={id:558,sku:"KK-014",name:"Kemeja Kantor KK-014",slug:"kk-014",status:"draft",type:"variable",description:"",short_description:"",price:"",regular_price:"",sale_price:"",date_created_gmt:"2026-08-20T06:49:44Z",variations:[],images:[],meta_data:[{id:1,key:"_ofissio_import_source",value:"woocommerce_csv"},{id:2,key:"_ofissio_source_id",value:"7819"}]};

assert.equal(assessPartialImportProduct({batch,item,planned,product}).state,"PARTIAL_IMPORT_PRODUCT","same-batch empty draft detected");
assert.equal(assessPartialImportProduct({batch,item,planned,product:{...product,status:"publish"}}).state,"MANUAL_REVIEW_REQUIRED","published product blocked");
assert.equal(assessPartialImportProduct({batch,item,planned,product:{...product,variations:[9001]}}).state,"MANUAL_REVIEW_REQUIRED","product with variations blocked");
assert.equal(assessPartialImportProduct({batch,item,planned,product:{...product,images:[{id:22,src:"https://example.test/a.jpg",name:"a",alt:""}]}}).state,"MANUAL_REVIEW_REQUIRED","product with images blocked");
assert.equal(assessPartialImportProduct({batch,item,planned,product:{...product,meta_data:[]}}).state,"MANUAL_REVIEW_REQUIRED","unrelated existing SKU is never owned by SKU alone");
assert.equal(assessPartialImportProduct({batch,item,planned,product:{...product,date_created_gmt:"2025-01-01T00:00:00Z"}}).state,"MANUAL_REVIEW_REQUIRED","legacy marker outside batch window is insufficient");
const explicitlyOwned={...product,date_created_gmt:"2025-01-01T00:00:00Z",meta_data:[{id:1,key:"_ofissio_import_batch_id",value:"batch-1"},{id:2,key:"_ofissio_import_source_id",value:"7819"}]};
assert.equal(assessPartialImportProduct({batch,item,planned,product:explicitlyOwned}).state,"PARTIAL_IMPORT_PRODUCT","new explicit ownership marker is authoritative");

const execute=await readFile(path.join(process.cwd(),"src/features/product-import/product-import-execute.service.ts"),"utf8");
const persistAt=execute.indexOf("target_product_id: String(product.id)");
const variationAt=execute.indexOf("createProductVariation(product.id");
assert.ok(persistAt>0&&variationAt>persistAt,"target_product_id persisted immediately before variations");
assert.match(execute,/deleteProductAndConfirm[\s\S]*ROLLBACK_COMPLETE/,"rollback complete follows confirmed Woo deletion");
assert.match(execute,/getProductVariations[\s\S]*PARTIAL_IMPORT/,"post-create counts are verified before IMPORTED");
assert.match(execute,/trackedProductId\)throw new Error\("Partial product terlacak/,"ordinary retry cannot auto-delete tracked product");
const recovery=await readFile(path.join(process.cwd(),"src/features/product-import/product-import-partial-recovery.service.ts"),"utf8");
assert.match(recovery,/productId === input\.productId[\s\S]*deleteProductAndConfirm\(input\.productId\)/,"controlled cleanup deletes exact revalidated product");
assert.match(recovery,/withStagedProductZip[\s\S]*executeProductImport\(\{ batchId: input\.batchId/,"clean retry reuses same batch and staged ZIP");
console.log("PASS: controlled partial product reconciliation checks");
}
main().catch(error=>{console.error(error);process.exitCode=1});
