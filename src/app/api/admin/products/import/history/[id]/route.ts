import { NextResponse } from "next/server";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { productImportRepository } from "@/features/product-import/product-import.repository";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const actor=requireInternalAdmin(request,"admin:catalog:view");const {id}=await params;const batch=await productImportRepository.assertOwnedBatch(id,actor.id);const items=await productImportRepository.listItems(id);const statuses=Object.fromEntries(["PENDING","UPLOADING","IMPORTED","SKIPPED","FAILED"].map(status=>[status,items.filter(item=>item.status===status).length]));return NextResponse.json({ok:true,batch,progress:{total:items.length,statuses,items:items.map(item=>({sourceId:item.source_id,sku:item.target_sku??item.source_sku,status:item.status,error:item.error_message,updatedAt:item.updated_at}))}});}catch(error){return safeErrorResponse(error,"Progress import belum dapat dimuat.",400);}}
