import { NextResponse } from "next/server";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { PRODUCT_IMPORT_LIMITS } from "@/features/product-import/product-import.config";
import { executeProductImport } from "@/features/product-import/product-import-execute.service";
import { assertBatchSourceHashes, withStagedProductZip } from "@/features/product-import/product-import-staging.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
export const runtime = "nodejs";
export async function POST(request: Request) { try { rateLimitOrThrow({ key: createRateLimitKey(request,"admin.products.import.execute"),limit:2,windowMs:60_000 }); const actor=requireInternalAdmin(request,"admin:catalog:update"); const form=await request.formData(); const batchId=String(form.get("batchId")??""); if(!/^[0-9a-f-]{36}$/i.test(batchId)) throw createApiError("VALIDATION_ERROR","Batch ID tidak valid.",400); const woo=file(form,"wooCsv",".csv",PRODUCT_IMPORT_LIMITS.maxCsvBytes); const manifest=file(form,"manifestCsv",".csv",PRODUCT_IMPORT_LIMITS.maxCsvBytes); const [wooCsv,manifestCsv]=await Promise.all([woo.text(),manifest.text()]); const result=await withStagedProductZip({batchId,actorId:actor.id,callback:async({filePath,sha256,batch})=>{assertBatchSourceHashes(batch,wooCsv,manifestCsv);return executeProductImport({batchId,wooCsv,manifestCsv,zipFilePath:filePath,zipHash:sha256});}}); return NextResponse.json({ok:true,result}); } catch(error){return safeErrorResponse(error,"Import draft belum dapat dijalankan.",400);} }
function file(form:FormData,key:string,extension:string,max:number){const value=form.get(key);if(!(value instanceof File)||value.size<=0||value.size>max||!value.name.toLowerCase().endsWith(extension))throw createApiError("VALIDATION_ERROR",`File ${key} tidak valid.`,400);return value;}
