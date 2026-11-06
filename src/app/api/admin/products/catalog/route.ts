import { requireInternalAdmin } from "@/features/admin/admin.service";
import { catalogExportSchema } from "@/features/catalog-export/catalog-export.schema";
import { exportCatalog } from "@/features/catalog-export/catalog-export.service";
import { prepareCatalogDownload } from "@/features/catalog-export/catalog-download.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { createApiError, safeErrorResponse } from "@/lib/security/safe-error-response";
import { logAuditEvent } from "@/lib/security/audit-log";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";
export const maxDuration = 360;

async function readOptions(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw createApiError("BAD_REQUEST", "Pilihan ekspor belum diisi.",400);
  let text = ""; let size = 0;
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size>16_384) { await reader.cancel(); throw createApiError("BAD_REQUEST", "Pilihan ekspor terlalu besar.",413); }
      text += decoder.decode(value,{stream:true});
    }
    text += decoder.decode();
    let value: unknown;
    try { value = JSON.parse(text); } catch { throw createApiError("BAD_REQUEST", "Pilihan ekspor tidak valid.",400); }
    return validateInput(catalogExportSchema,value);
  } finally { reader.releaseLock(); }
}

export async function POST(request: Request) {
  try {
    const actor = requireInternalAdmin(request,"admin:catalog:view");
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== request.headers.get("host")) throw createApiError("FORBIDDEN","Permintaan ekspor tidak diizinkan.",403);
    rateLimitOrThrow({ key: createRateLimitKey(request,`admin.catalog.export.${actor.id}`), limit: 6, windowMs: 300_000 });
    const options = await readOptions(request);
    const result = await exportCatalog(options,request.signal);
    logAuditEvent({ request, actorId:actor.id, actorType:"internal", action:"admin_catalog_exported", entityType:"product", metadata:{ products:result.products,pages:result.pages,format:options.format,showPrices:options.showPrices } });
    const headers: Record<string,string> = {
      "Cache-Control":"private, no-store", "X-Content-Type-Options":"nosniff", "X-Catalog-Pages":String(result.pages), "X-Catalog-Products":String(result.products), "X-Catalog-Warnings":String(result.warnings.length),
      "Content-Type":options.format === "pdf" ? "application/pdf" : "text/html; charset=utf-8",
      "Content-Disposition":`${options.format === "pdf" ? "attachment" : "inline"}; filename="ofissio-katalog.${options.format === "pdf" ? "pdf" : "html"}"`,
    };
    if (options.format === "preview") headers["Content-Security-Policy"]="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; sandbox";
    if(options.format==="pdf" && options.delivery==="link"){
      const download=await prepareCatalogDownload(result.bytes,actor.id);
      return Response.json(download,{headers:{...headers,"Content-Type":"application/json","Content-Disposition":"inline"}});
    }
    return new Response(new Uint8Array(result.bytes),{headers});
  } catch (error) { return safeErrorResponse(error,"Katalog belum dapat diekspor.",500); }
}
