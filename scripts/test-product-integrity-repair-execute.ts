import assert from "node:assert/strict";
import fs from "node:fs";
import { woocommerceClient } from "../src/features/products/woocommerce/woocommerce.client";
import { repairAndVerifyVariations, updateAndVerifyVariation, variationMatches } from "../src/features/product-integrity-repair/product-integrity-repair-execute.service";
import type { WooCommerceProductVariation } from "../src/features/products/woocommerce/woocommerce.types";

const variation=(sku:string,option="S"):WooCommerceProductVariation=>({id:145,sku,price:"195000",regular_price:"195000",sale_price:"",attributes:[{id:1,name:"UKURAN",option}],meta_data:[]});
const originalGet=woocommerceClient.getProductVariation;const originalUpdate=woocommerceClient.updateProductVariation;
async function run(){
  let state=variation("TG-054");let payloadSku:unknown="not-called";let updates=0;
  woocommerceClient.getProductVariation=async()=>state;
  woocommerceClient.updateProductVariation=async(_productId,_variationId,payload)=>{updates+=1;payloadSku=payload.sku;state=variation(typeof payload.sku==="string"?payload.sku:"TG-054");return state;};
  const readRaw=async()=>({...state,rawSku:state.sku,displaySku:state.sku||"TG-054",inheritedFromParent:!state.sku});
  await updateAndVerifyVariation(144,145,{sku:undefined,attributes:[{name:"UKURAN",option:"S"}]},readRaw);
  assert.equal(payloadSku,"","null/undefined source SKU must become an explicit empty string");assert.equal(state.sku,"");assert.equal(updates,1);

  state=variation("TG-054");updates=0;
  woocommerceClient.updateProductVariation=async()=>{updates+=1;return state;};
  await assert.rejects(()=>updateAndVerifyVariation(144,145,{sku:"",attributes:[{name:"UKURAN",option:"S"}]},readRaw),/VARIATION_REPAIR_VERIFICATION_FAILED/);
  assert.equal(updates,1,"2xx with stale read-back must fail, not count as repaired");

  const before=variation("TG-054","M");const correct=variation("","M");
  assert.equal(variationMatches(correct,{sku:"",attributes:[{name:"UKURAN",option:"M"}]},before),true);
  assert.equal(variationMatches({...correct,regular_price:"1"},{sku:"",attributes:[{name:"UKURAN",option:"M"}]},before),false,"price changes must fail verification");
  assert.equal(variationMatches(variation("","L"),{sku:"",attributes:[{name:"UKURAN",option:"M"}]},before),false,"attribute changes must fail verification");

  const sizes=["S","M","L","XL","2XL","3XL","4XL"];
  const states=new Map(sizes.map((size,index)=>[145+index,variation("TG-054",size)]));
  woocommerceClient.getProductVariation=async(_productId,id)=>states.get(Number(id))!;
  woocommerceClient.updateProductVariation=async(_productId,id,payload)=>{const old=states.get(Number(id))!;const next={...old,sku:String(payload.sku??""),attributes:payload.attributes??old.attributes};states.set(Number(id),next);return next;};
  const repairs=sizes.map((size,index)=>({variationId:145+index,targetSku:"",targetAttributes:[{name:"UKURAN",option:size}]}));
  const readMappedRaw=async(_productId:number,id:number)=>{const value=states.get(id)!;return{...value,rawSku:value.sku,displaySku:value.sku||"TG-054",inheritedFromParent:!value.sku};};
  assert.deepEqual(await repairAndVerifyVariations(144,repairs,readMappedRaw),{verified:7,total:7},"7/7 read-back matches must repair the product");

  states.forEach((value,id)=>states.set(id,{...value,sku:"TG-054"}));
  woocommerceClient.updateProductVariation=async(_productId,id,payload)=>{const old=states.get(Number(id))!;const next=Number(id)===151?old:{...old,sku:String(payload.sku??""),attributes:payload.attributes??old.attributes};states.set(Number(id),next);return next;};
  let partial:unknown;try{await repairAndVerifyVariations(144,repairs,readMappedRaw);}catch(error){partial=error;}
  assert.equal((partial as {verified?:number}).verified,6,"6/7 verified must be partial, never repaired");
  assert.equal((partial as {total?:number}).total,7);

  const source=fs.readFileSync("src/features/product-integrity-repair/product-integrity-repair-execute.service.ts","utf8");
  assert.equal(source.includes("createProductVariation"),false,"repair must never create extra variations");
  assert.match(source,/PARTIALLY_REPAIRED/);assert.match(source,/getProductVariation\(productId,variationId\)/);
  console.log("PASS: variation empty-SKU payload, mandatory read-back, partial semantics, attribute/price preservation, and no variation creation");
}
run().finally(()=>{woocommerceClient.getProductVariation=originalGet;woocommerceClient.updateProductVariation=originalUpdate;});
