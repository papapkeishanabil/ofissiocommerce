import assert from "node:assert/strict";
import fs from "node:fs";
import type { WooCommerceProduct, WooCommerceProductVariation, WooCommerceProductWritePayload } from "../src/features/products/woocommerce/woocommerce.types";

const batchId="batch-1";const productId=728;const sourceParentId="10404";
const variations:WooCommerceProductVariation[]=["S","M","L","XL","XXL","3XL"].map((size,index)=>({id:800+index,sku:`KK-020-${size}`,rawSku:`KK-020-${size}`,regular_price:"100",sale_price:"",attributes:[{name:"Ukuran",option:size}]}));
const baseProduct:WooCommerceProduct={id:productId,name:"Kemeja Kerja Putih KK-020",slug:"kemeja-kk-020",sku:"UNKNOWN",status:"draft",type:"variable",description:"description",short_description:"short",price:"100",regular_price:"100",sale_price:"",variations:variations.map((item)=>item.id),images:[{id:91,src:"https://target.test/a.jpg"}],meta_data:[{key:"_ofissio_import_batch_id",value:batchId},{key:"_ofissio_import_source_id",value:sourceParentId}]};
const input={batchId,productId,sourceParentId,proposedSku:"KK-020",expectedCurrentSku:"UNKNOWN",acknowledged:true,typedConfirmation:"KK-020",actorId:"admin-1"};

async function main(){
  const {resolveManualSku}=await import("../src/features/product-integrity-repair/manual-sku-resolution.service");
  const audits:unknown[]=[];let writes:unknown[]=[];let current={...baseProduct};let currentVariations=structuredClone(variations);
  const dependencies=()=>({getBatch:async()=>({id:batchId}),listItems:async()=>[{target_product_id:String(productId),source_id:sourceParentId,source_sku:"UNKNOWN",status:"IMPORTED"}],getProduct:async()=>structuredClone(current),getProducts:async()=>[],getVariations:async()=>structuredClone(currentVariations),getRawSkus:async()=>[],updateProduct:async(_id:string|number,payload:WooCommerceProductWritePayload)=>{writes.push(payload);current={...current,...payload} as WooCommerceProduct;return structuredClone(current);},findSkuOwner:async()=>null,audit:(event:unknown)=>{audits.push(event);return event as never;}});

  await expectCode(()=>resolveManualSku({...input,acknowledged:false},dependencies()),"MANUAL_CONFIRMATION_REQUIRED");assert.equal(writes.length,0);
  await expectCode(()=>resolveManualSku(input,{...dependencies(),findSkuOwner:async()=>({entityId:999,entityType:"variation"})}),"SKU_CONFLICT");assert.equal(writes.length,0);
  current={...baseProduct,sku:"CHANGED"};await expectCode(()=>resolveManualSku(input,dependencies()),"STALE_MANUAL_RESOLUTION");assert.equal(writes.length,0);

  current={...baseProduct};writes=[];
  const noReadback={...dependencies(),updateProduct:async(_id:string|number,payload:WooCommerceProductWritePayload)=>{writes.push(payload);return{...current,...payload} as WooCommerceProduct;}};
  await expectCode(()=>resolveManualSku(input,noReadback),"MANUAL_SKU_VERIFICATION_FAILED");assert.deepEqual(writes,[{sku:"KK-020"}]);

  current={...baseProduct};writes=[];audits.length=0;
  const beforeVariations=structuredClone(currentVariations);const beforeImages=structuredClone(current.images);const result=await resolveManualSku(input,dependencies());
  assert.equal(result.status,"RESOLVED");assert.equal(current.sku,"KK-020");assert.deepEqual(writes,[{sku:"KK-020"}],"write payload must contain SKU only");
  assert.equal(current.status,"draft");assert.deepEqual(current.images,beforeImages);assert.deepEqual(currentVariations,beforeVariations);assert.equal(audits.length,1);
  assert.match(JSON.stringify(audits[0]),/MANUAL_ADMIN_APPROVAL/);assert.match(JSON.stringify(audits[0]),/NO_EXACT_PARENT_SKU/);

  const client=fs.readFileSync("src/features/product-integrity-repair/components/ProductIntegrityRepairClient.tsx","utf8");
  assert.match(client,/Resolve Manually/);assert.match(client,/disabled=\{!selectable\}/);assert.match(client,/typed\.trim\(\)\.toUpperCase\(\)===row\.target\.toUpperCase\(\)/);assert.match(client,/setPlan\(null\)/);
  const planner=fs.readFileSync("src/features/product-integrity-repair/product-integrity-repair.service.ts","utf8");
  assert.match(planner,/manualResolutionEligible/);assert.match(planner,/MANUAL_REVIEW_REQUIRED/);assert.match(planner,/CHILD_VARIATION_SKU_PREFIX/);
  console.log("PASS: manual-only UI, explicit approval, fresh conflict/stale gates, SKU-only write, protected fields, read-back, audit, and plan invalidation");
}
async function expectCode(run:()=>Promise<unknown>,errorCode:string){let caught:unknown;try{await run();}catch(error){caught=error;}assert.ok(caught instanceof Error);const metadata=(caught as Error&{metadata?:Record<string,unknown>}).metadata??{};assert.equal(metadata.errorCode,errorCode);}
main().catch((error)=>{console.error(error);process.exitCode=1;});
