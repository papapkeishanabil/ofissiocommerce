/** Default is read-only. Production writes require a verified plan AND --apply --allow-production. */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {isDeepStrictEqual as equal} from "node:util";
import path from "node:path";
import {woocommerceClient} from "../src/features/products/woocommerce/woocommerce.client";
import {withLiveColorVariants} from "../src/features/products/woocommerce/color-variants.service";
import {getCommerceRuntimeConfig} from "../src/features/commerce/commerce.config";
import {readProductSeo,PRODUCT_SEO_META,pageSeoSchema} from "../src/features/seo/page-seo";
import {productAutomaticSeo,productSeoInputFromWoo} from "../src/features/seo/product-automatic-seo";
import {logAuditEvent} from "../src/lib/security/audit-log";

async function main(){
 const directory=process.argv[2];assert(directory,"Pass private plan directory");const args=new Set(process.argv.slice(3)),apply=args.has("--apply");
 const serialized=readFileSync(path.join(directory,"dry-run-private.json"),"utf8"),plan=JSON.parse(serialized),verified=JSON.parse(readFileSync(path.join(directory,"verified-staging.json"),"utf8"));
 assert.equal(createHash("sha256").update(serialized).digest("hex"),verified.planSha256,"Plan changed after verification");
 assert(verified.initialHtmlEqualsAdminEffective&&verified.canonicalPreserved&&verified.manualOverrideAndResetPassed&&verified.newProductPublishedAndVerified,"Complete staging verification is required");
 assert.equal(createHash("sha256").update(readFileSync("src/features/seo/product-automatic-seo.ts")).digest("hex"),verified.generatorSha256,"Generator changed after verification");
 const config=getCommerceRuntimeConfig();assert.equal(config.productSource,"woocommerce");
 if(apply){
  assert(args.has("--staging-only")||args.has("--allow-production"),"Choose explicit --staging-only or --allow-production");
  if(args.has("--staging-only"))assert(["localhost","127.0.0.1"].includes(new URL(config.woocommerce.baseUrl).hostname)&&process.env.DATABASE_PROVIDER==="mock","Staging writes require loopback fixture and mock database");
 }
 const queued=[];let alreadyApplied=0;
 for(const row of plan.plans){
  const raw=await woocommerceClient.getProductById(row.productId);assert.equal(raw.status,"publish","Product publication changed");assert.equal(raw.slug,row.slug,"Product URL changed");
  const current=readProductSeo(raw.meta_data??[]);pageSeoSchema.parse(row.proposed);
  if(equal(current,row.proposed)){alreadyApplied++;continue;}
  assert(equal(current,row.old),"SEO changed after the audit; preserve it and regenerate the dry-run");
  for(const field of ["title","description"] as const)if(row.old[field]&&row.proposed[field]==="")assert.equal(row.origins[field],"confirmed-bulk-fill","Only proven bulk overrides may be cleared");
  for(const field of ["title","description","primaryKeyword","relatedKeywords"] as const)if(row.origins[field]!=="confirmed-bulk-fill")assert(equal(row.old[field],row.proposed[field]),"Protected manual field would change");
  const automatic=productAutomaticSeo(productSeoInputFromWoo(await withLiveColorVariants(raw)));
  assert.equal(automatic.title,row.automatic.title,"Product facts changed since verification");assert.equal(automatic.description,row.automatic.description,"Product facts changed since verification");
  queued.push({row,raw});
 }
 if(!apply){console.log(JSON.stringify({dryRun:true,pendingProducts:queued.length,alreadyApplied,productionWrites:false}));return;}
 const journal:{startedAt:string;applied:number[];backup:unknown[]}={startedAt:new Date().toISOString(),applied:[],backup:queued.map(({row,raw})=>({productId:row.productId,meta:(raw.meta_data??[]).find(m=>m.key===PRODUCT_SEO_META)??null}))};
 const save=()=>writeFileSync(path.join(directory,"migration-journal.json"),JSON.stringify(journal,null,2),{mode:0o600});save();
 for(const {row,raw} of queued){
  const fresh=await woocommerceClient.getProductById(row.productId);assert(equal(readProductSeo(fresh.meta_data??[]),row.old),"Concurrent manual edit; migration stopped");
  const meta=(fresh.meta_data??[]).find(m=>m.key===PRODUCT_SEO_META);
  await woocommerceClient.updateProduct(row.productId,{meta_data:[{...(meta?.id?{id:meta.id}:{}),key:PRODUCT_SEO_META,value:JSON.stringify(row.proposed)}]});
  const read=await woocommerceClient.getProductById(row.productId);assert(equal(readProductSeo(read.meta_data??[]),row.proposed),"Migration read-back failed");
  for(const field of ["name","slug","description","short_description","regular_price","sale_price","images","categories","attributes","sku"] as const)assert(equal(read[field],raw[field]),"Non-SEO product data changed; inspect journal before proceeding");
  journal.applied.push(row.productId);save();logAuditEvent({actorId:"seo-auto-migration",actorType:"internal",action:"product_seo_bulk_override_to_auto",entityType:"product",entityId:String(row.productId),metadata:{seoOnly:true,planSha256:verified.planSha256}});
 }
 console.log(JSON.stringify({applied:journal.applied.length,alreadyApplied,stagingOnly:args.has("--staging-only")}));
}
main().catch(error=>{console.error("SEO_MIGRATION_STOPPED",error.message);process.exitCode=1;});
