import { requireInternalAdmin } from "@/features/admin/admin.service";
import { catalogDownloadResponse } from "@/features/catalog-export/catalog-download.service";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime="nodejs";
export async function GET(request: Request) {
  try {
    const actor=requireInternalAdmin(request,"admin:catalog:view");
    return await catalogDownloadResponse(request,actor.id);
  } catch(error) { return safeErrorResponse(error,"File katalog belum dapat diunduh.",500); }
}
export const HEAD=GET;
