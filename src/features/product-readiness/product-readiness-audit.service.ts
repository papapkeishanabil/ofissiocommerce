import "server-only";
import { woocommerceClient } from "@/features/products/woocommerce/woocommerce.client";
import { attachRawVariationSkus } from "@/features/products/woocommerce/woocommerce-raw-variation.service";
import { withWordPressProviderSlot } from "@/features/products/woocommerce/wordpress-provider-gate";
import type { WooCommerceProduct } from "@/features/products/woocommerce/woocommerce.types";
import { productImportRepository } from "@/features/product-import/product-import.repository";
import type { ProductImportPlan } from "@/features/product-import/product-import.types";
import { fingerprintVariationTarget } from "@/features/product-integrity-repair/variation-blocker-triage";
import { auditProductReadiness } from "./product-readiness-audit";
import type { BulkProductQa,BulkProductQaReport,BulkReadinessLevel } from "./product-readiness.types";

type Row=Record<string,unknown>;
export async function generateBulkProductQa(input:{scope?:"drafts"|"batch"|"sku";batchId?:string;sku?:string}):Promise<BulkProductQaReport>{
 const scope=input.scope??(input.batchId?"batch":"drafts");let batch:Row|null=null,items:Row[]=[];let products:WooCommerceProduct[]=[];
 if(scope==="batch"){if(!input.batchId)throw new Error("Batch ID wajib untuk scope batch.");batch=await productImportRepository.getBatch(input.batchId);if(!batch)throw new Error("Batch import tidak ditemukan.");items=(await productImportRepository.listItems(input.batchId)).filter(v=>v.status==="IMPORTED");products=(await concurrent(items,2,async item=>item.target_product_id?woocommerceClient.getProductById(String(item.target_product_id)):null)).filter((v):v is WooCommerceProduct=>Boolean(v));}
 else if(scope==="sku"){if(!input.sku?.trim())throw new Error("SKU wajib diisi.");products=await woocommerceClient.getProducts({sku:input.sku.trim(),status:"any",per_page:100});}
 else products=await listDrafts();
 const plan=batch?.plan_json as ProductImportPlan|undefined;const skuCounts=new Map<string,number>();for(const product of products){const key=product.sku.trim().toUpperCase();if(key)skuCounts.set(key,(skuCounts.get(key)??0)+1)}
 const masters=await loadMasters();const imageNames=new Map<string,number>();for(const product of products)for(const image of product.images??[]){const key=imageName(image.src||image.name||"");if(key)imageNames.set(key,(imageNames.get(key)??0)+1)}
 const acceptedVariationTargets=asRow(asRow(batch?.result_json).acceptedVariationTargets);
 const audited=await concurrent(products,2,async product=>{
  const item=items.find(v=>String(v.target_product_id)===String(product.id));
  const planned=plan?.products.find(v=>v.sourceId===String(item?.source_id));
  const displayVariations=product.type==="variable"?await woocommerceClient.getProductVariations(product.id,{per_page:100}):[];
  const variations=displayVariations.length?await attachRawVariationSkus(product.id,displayVariations):[];
  const broken=await countBrokenImages(product);
  const duplicateMedia=(product.images??[]).filter(image=>(imageNames.get(imageName(image.src||image.name||""))??0)>1).length;
  const qa=auditProductReadiness({product,variations,item,planned:planned as unknown as Row|undefined,duplicateSku:(skuCounts.get(product.sku.trim().toUpperCase())??0)>1,brokenImages:broken,duplicateMedia,masters});
  return applyAcceptedVariationDisposition(qa,variations,acceptedVariationTargets[String(product.id)]);
 });
 const levels:BulkReadinessLevel[]=["READY","NEEDS_DATA","NEEDS_REVIEW","BLOCKED","SKIPPED_SPECIAL_PRODUCT"];const issueCounts:Record<string,number>={};for(const product of audited)for(const group of new Set(product.issues.map(issue=>issue.group)))issueCounts[group]=(issueCounts[group]??0)+1;const catalog=audited.filter(v=>v.level!=="SKIPPED_SPECIAL_PRODUCT");
 return{generatedAt:new Date().toISOString(),scope,batchId:input.batchId??null,products:audited.sort((a,b)=>a.sku.localeCompare(b.sku)),summary:{total:catalog.length,scanned:audited.length,specialProducts:audited.length-catalog.length,...Object.fromEntries(levels.map(level=>[level,audited.filter(v=>v.level===level).length]))} as BulkProductQaReport["summary"],issueCounts,imageSummary:{local:catalog.filter(v=>v.photoSource==="NEW_LOCAL_PHOTOS").length,legacy:catalog.filter(v=>v.photoSource==="LEGACY_WOOCOMMERCE").length,broken:catalog.reduce((n,v)=>n+v.brokenImages,0),missing:catalog.filter(v=>v.imageCount===0).length,potentialDuplicates:catalog.reduce((n,v)=>n+v.potentialDuplicateMedia,0)},variationSummary:{expected:catalog.reduce((n,v)=>n+(v.expectedVariations??0),0),actual:catalog.reduce((n,v)=>n+v.actualVariations,0),mismatchProducts:catalog.filter(v=>v.issues.some(i=>i.code==="variation_mismatch")).length,withoutSourceSku:catalog.reduce((n,v)=>n+v.withoutSourceSku,0),preserved:catalog.reduce((n,v)=>n+v.preservedWithoutSku,0),blocked:catalog.filter(v=>v.level==="BLOCKED"&&v.issues.some(i=>i.group==="Variations")).length}};
}
async function listDrafts(){const rows:WooCommerceProduct[]=[];for(let page=1;page<=20;page++){const chunk=await woocommerceClient.getProducts({status:"draft",page,per_page:100});rows.push(...chunk);if(chunk.length<100)break}return rows}
async function loadMasters(){const attrs=await woocommerceClient.getAttributes();const result={materials:new Set<string>(),sizes:new Set<string>(),colors:new Set<string>()};for(const attr of attrs){const slug=(attr.slug||attr.name).toLowerCase().replace(/^pa_/,"");const target=["material","bahan"].includes(slug)?result.materials:["ukuran","size"].includes(slug)?result.sizes:["warna","color"].includes(slug)?result.colors:null;if(!target)continue;for(const term of await woocommerceClient.getAttributeTerms(attr.id))target.add(term.name.trim().toLowerCase().replace(/[_\s]+/g,"-"))}return result}
async function countBrokenImages(product:WooCommerceProduct){const results=await concurrent(product.images??[],8,async image=>{if(!image.id||!isHttp(image.src))return 1;try{return await withWordPressProviderSlot("HEAD product image",async()=>{const response=await fetch(image.src,{method:"HEAD",cache:"no-store",signal:AbortSignal.timeout(5000)});return response.ok||response.status===405?0:1})}catch{return 1}});return results.reduce<number>((n,v)=>n+v,0)}
function isHttp(value:string){try{return["http:","https:"].includes(new URL(value).protocol)}catch{return false}}
function imageName(value:string){try{return decodeURIComponent(new URL(value,"https://ofissio.local").pathname.split("/").pop()??"").toLowerCase()}catch{return value.toLowerCase()}}
async function concurrent<T,R>(items:T[],limit:number,fn:(item:T)=>Promise<R>){const results=new Array<R>(items.length);let cursor=0;await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(cursor<items.length){const index=cursor++;results[index]=await fn(items[index]!)}}));return results}

export function applyAcceptedVariationDisposition(qa:BulkProductQa,variations:Parameters<typeof fingerprintVariationTarget>[0],evidence:unknown):BulkProductQa{
 const accepted=asRow(evidence);
 if(accepted.disposition!=="ACCEPT_CURRENT_TARGET_WITH_EVIDENCE"||accepted.reason!=="TARGET_HEALTHY_SOURCE_INCOMPLETE")return qa;
 if(accepted.productId!==qa.productId||accepted.targetFingerprint!==fingerprintVariationTarget(variations).targetFingerprint)return qa;
 const issues=qa.issues.filter(issue=>issue.group!=="Variations");
 return{...qa,issues,level:resolveReadiness(issues),dispositionReason:"ACCEPT_CURRENT_TARGET_WITH_EVIDENCE"};
}
function resolveReadiness(issues:BulkProductQa["issues"]):BulkReadinessLevel{return issues.some(issue=>issue.level==="BLOCKED")?"BLOCKED":issues.some(issue=>issue.level==="NEEDS_DATA")?"NEEDS_DATA":issues.some(issue=>issue.level==="NEEDS_REVIEW")?"NEEDS_REVIEW":"READY"}
function asRow(value:unknown):Row{return value&&typeof value==="object"&&!Array.isArray(value)?value as Row:{}}

export function bulkQaCsv(report:BulkProductQaReport){const headers=["SKU","Product","Readiness","Woo Status","Category","Industries","Variation Expected","Variation Actual","Images","Photo Source","MOQ","Lead Time","Fulfillment","Transaction Mode","Material","Size","3D","Issue Count","Issues"];const rows=report.products.map(p=>[p.sku,p.name,p.level,p.wooStatus,p.categories.join(" | "),p.industries.join(" | "),p.expectedVariations??"",p.actualVariations,p.imageCount,p.photoSource,p.moq,p.leadTime,p.fulfillment,p.transactionMode,p.materials.join(" | "),p.sizes.join(" | "),p.has3D?"READY":"MISSING",p.issues.length,p.issues.map(i=>i.label).join(" | ")]);return[headers,...rows].map(row=>row.map(csv).join(",")).join("\r\n")}
function csv(value:unknown){return`"${String(value??"").replace(/"/g,'""')}"`}
