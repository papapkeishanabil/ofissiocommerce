import { NextResponse } from "next/server";
import { requireInternalAdmin } from "@/features/admin/admin.service";
import { cleanupProductImportBatch } from "@/features/product-import/product-import-staging.service";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
export const runtime = "nodejs";
export async function DELETE(request: Request) { try { const actor=requireInternalAdmin(request,"admin:catalog:update"); const body=await request.json() as {batchId?:string}; await cleanupProductImportBatch({batchId:String(body.batchId??""),actorId:actor.id}); return NextResponse.json({ok:true}); } catch(error){return safeErrorResponse(error,"Staging ZIP belum dapat dibersihkan.",400);} }
