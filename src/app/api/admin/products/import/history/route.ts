import { NextResponse } from "next/server";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { classifyProductImportHistory, countProductImportItemStatuses } from "@/features/product-import/product-import-history";
import { productImportRepository } from "@/features/product-import/product-import.repository";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime="nodejs";
export async function GET(request:Request){try{requireInternalAdmin(request,"admin:catalog:view");const [batches,statusRows]=await Promise.all([productImportRepository.listBatches(),productImportRepository.listItemStatuses()]);const counts=countProductImportItemStatuses(statusRows);return NextResponse.json({ok:true,batches:batches.map(batch=>{const itemCounts=counts.get(String(batch.id))??{imported:0,failed:0,skipped:0,pending:0,uploading:0};const state=classifyProductImportHistory({status:String(batch.status),failedItems:itemCounts.failed,verifiedStaging:isVerified(batch)});return{...batch,itemCounts,recovery:{state,continueUrl:state==="CONTINUE_IMPORT"?`/admin/products/import?batchId=${batch.id}`:state==="RETRYABLE_FAILED_ITEMS"?`/admin/products/import/history/${batch.id}`:null}}})},{headers:{"Cache-Control":"no-store"}})}catch(error){return safeErrorResponse(error,"Riwayat import belum dapat dimuat.",400)}}
function isVerified(batch:Record<string,unknown>){const result=batch.result_json&&typeof batch.result_json==="object"?batch.result_json as Record<string,unknown>:{};const staging=Array.isArray(batch.staging_objects)?batch.staging_objects[0] as Record<string,unknown>|undefined:undefined;return result.uploadState==="VERIFIED"&&staging?.state==="VERIFIED"}
