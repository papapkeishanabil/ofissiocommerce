import { NextResponse } from "next/server";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { PRODUCT_IMPORT_LIMITS } from "@/features/product-import/product-import.config";
import { recoverPartialImportProduct } from "@/features/product-import/product-import-partial-recovery.service";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";

export const runtime="nodejs";
export async function POST(request:Request){try{rateLimitOrThrow({key:createRateLimitKey(request,"admin.products.import.recover-partial"),limit:1,windowMs:60_000});const actor=requireInternalAdmin(request,"admin:catalog:update");const form=await request.formData();const batchId=String(form.get("batchId")??""),sourceId=String(form.get("sourceId")??""),productId=Number(form.get("productId"));if(!/^[0-9a-f-]{36}$/i.test(batchId)||!sourceId||!Number.isSafeInteger(productId)||productId<=0)throw createApiError("VALIDATION_ERROR","Referensi recovery tidak valid.",400);const woo=file(form,"wooCsv"),manifest=file(form,"manifestCsv");const result=await recoverPartialImportProduct({batchId,sourceId,productId,actorId:actor.id,wooCsv:await woo.text(),manifestCsv:await manifest.text()});return NextResponse.json({ok:true,result},{headers:{"Cache-Control":"no-store"}});}catch(error){return safeErrorResponse(error,"Partial import belum dapat dipulihkan.",400)}}
function file(form:FormData,key:string){const value=form.get(key);if(!(value instanceof File)||value.size<=0||value.size>PRODUCT_IMPORT_LIMITS.maxCsvBytes||!value.name.toLowerCase().endsWith(".csv"))throw createApiError("VALIDATION_ERROR",`File ${key} tidak valid.`,400);return value;}
