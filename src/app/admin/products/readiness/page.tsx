import Link from "next/link";
import { ArrowLeft, ShieldCheck, Wrench } from "lucide-react";
import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { AdminPageHeader } from "@/features/admin/components/AdminSurface";
import { BulkProductReadinessClient } from "@/features/product-readiness/components/BulkProductReadinessClient";
import { generateBulkProductQa } from "@/features/product-readiness/product-readiness-audit.service";

export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ scope?: string; batchId?: string; sku?: string }> }) {
  await requireInternalAdminServer("admin:catalog:view");
  const query = await searchParams;
  const scope = query.scope === "sku" ? "sku" : query.scope === "drafts" ? "drafts" : query.batchId ? "batch" : "drafts";
  const report = await generateBulkProductQa({ scope, batchId: query.batchId, sku: query.sku });
  const repairHref = `/admin/products/readiness/repair${query.batchId ? `?batchId=${encodeURIComponent(query.batchId)}` : ""}`;
  return <div className="space-y-6">
    <AdminPageHeader eyebrow="Read-only product QA" title="Bulk Product Readiness" description="Scan, validate, classify, and report. Halaman ini tidak mengubah produk, variasi, media, kategori, atau status publish." actions={<div className="flex flex-wrap gap-2"><Link href={repairHref} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-700 px-4 font-bold text-white"><Wrench className="h-4 w-4"/>Integrity Repair</Link><Link href="/admin/products" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-4 font-bold text-brand-700"><ArrowLeft className="h-4 w-4"/>Kembali ke Produk</Link></div>}>
      <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-800"><ShieldCheck className="h-4 w-4"/>Read-only audit, generated {new Date(report.generatedAt).toLocaleString("id-ID")}</div>
    </AdminPageHeader>
    <form method="get" className="grid gap-3 rounded-xl border border-line bg-white p-4 md:grid-cols-[1fr_2fr_auto]"><select name="scope" defaultValue={scope} aria-label="Scan scope" className="min-h-11 rounded-lg border border-line px-3"><option value="drafts">All Draft Products</option><option value="batch">Imported Batch</option><option value="sku">Specific SKU</option></select><input name={scope === "sku" ? "sku" : "batchId"} defaultValue={scope === "sku" ? query.sku : query.batchId} placeholder={scope === "sku" ? "SKU" : "Batch ID"} className="min-h-11 rounded-lg border border-line px-3"/><button className="min-h-11 rounded-lg bg-brand-700 px-5 font-bold text-white">Run Read-only Scan</button></form>
    <BulkProductReadinessClient report={report}/>
  </div>;
}
