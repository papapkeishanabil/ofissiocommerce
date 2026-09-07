import { requireInternalAdmin } from "@/features/admin/admin.service";
import { bulkQaCsv,generateBulkProductQa } from "@/features/product-readiness/product-readiness-audit.service";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
export const runtime="nodejs";
export async function GET(request:Request){try{requireInternalAdmin(request,"admin:catalog:view");const query=new URL(request.url).searchParams;const scope=query.get("scope")==="sku"?"sku":query.get("scope")==="drafts"?"drafts":query.get("batchId")?"batch":"drafts";const report=await generateBulkProductQa({scope,batchId:query.get("batchId")??undefined,sku:query.get("sku")??undefined});return new Response(`\uFEFF${bulkQaCsv(report)}`,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="ofissio-product-qa-${new Date().toISOString().slice(0,10)}.csv"`,"Cache-Control":"no-store"}})}catch(error){return safeErrorResponse(error,"QA CSV belum dapat dibuat.",400)}}
