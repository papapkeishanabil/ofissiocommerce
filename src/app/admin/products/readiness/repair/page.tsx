import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { AdminPageHeader } from "@/features/admin/components/AdminSurface";
import { ProductIntegrityRepairClient } from "@/features/product-integrity-repair/components/ProductIntegrityRepairClient";

export default async function Page({searchParams}:{searchParams:Promise<{batchId?:string}>}){
  await requireInternalAdminServer("admin:catalog:update"); const query=await searchParams;
  return <div className="space-y-6"><AdminPageHeader eyebrow="Technical integrity only" title="Product Integrity Repair" description="Repair technical inconsistencies detected by the read-only readiness audit before catalog enrichment or publishing." actions={<Link href={`/admin/products/readiness${query.batchId?`?scope=batch&batchId=${encodeURIComponent(query.batchId)}`:""}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-4 font-bold text-brand-700"><ArrowLeft className="h-4 w-4"/>Kembali ke Readiness</Link>}><div className="mt-3 flex items-center gap-2 text-sm font-semibold text-amber-800"><ShieldAlert className="h-4 w-4"/>No enrichment, no bulk publish, explicit review required</div></AdminPageHeader><ProductIntegrityRepairClient initialBatchId={query.batchId}/></div>;
}
