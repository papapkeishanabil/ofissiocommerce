import Link from "next/link";
import { ArrowRight, History } from "lucide-react";
import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { AdminBackLink, AdminPageHeader } from "@/features/admin/components/AdminSurface";
import { ProductImportPreviewClient } from "@/features/product-import/components/ProductImportPreviewClient";
import { getProductImportLimits } from "@/features/product-import/product-import.config";
import { findRecoverableProductImport } from "@/features/product-import/product-import-recovery.service";

export const dynamic = "force-dynamic";
export default async function AdminProductImportPage({searchParams}:{searchParams:Promise<{batchId?:string}>}) {
  const actor=await requireInternalAdminServer("admin:catalog:update");
  const {batchId}=await searchParams;
  const recoverable=batchId?null:await findRecoverableProductImport(actor.id).catch(()=>null);
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Bulk Product Import"
        title="Import produk WooCommerce"
        description="Analisis data tetap preview-only. ZIP diverifikasi dan dry run dijalankan di server sebelum import draft dapat dipilih."
        actions={<div className="flex flex-wrap gap-2"><Link href="/admin/products/import/history" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-bold text-brand-700 transition hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"><History className="h-4 w-4" aria-hidden="true"/>Riwayat Import</Link><AdminBackLink href="/admin/products">Kembali ke Produk</AdminBackLink></div>}
      />
      {recoverable?<section aria-labelledby="unfinished-import-title" className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-soft-sm md:p-6"><p className="text-xs font-black uppercase tracking-[0.12em] text-amber-800">Import belum selesai</p><div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h2 id="unfinished-import-title" className="text-xl font-black text-ink">{recoverable.zipFilename}</h2><p className="mt-1 text-sm text-ink-muted">{formatFileSize(recoverable.zipSizeBytes)} · Status: <b className="text-emerald-700">ZIP VERIFIED</b></p><p className="mt-2 text-sm text-amber-900">File ZIP staging sudah divalidasi. Lanjutkan tanpa mengunggah ZIP kembali.</p></div><div className="flex flex-wrap gap-2"><Link href={`/admin/products/import?batchId=${recoverable.batchId}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 text-sm font-bold text-white transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">Lanjutkan Import<ArrowRight className="h-4 w-4" aria-hidden="true"/></Link><Link href="/admin/products/import/history" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-amber-300 bg-white px-5 text-sm font-bold text-amber-900 transition hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">Lihat Riwayat</Link></div></div></section>:null}
      <ProductImportPreviewClient maxZipBytes={getProductImportLimits().maxZipBytes} recoveryBatchId={batchId??null} />
    </div>
  );
}
function formatFileSize(bytes:number){return`${(bytes/1024/1024).toFixed(2)} MB`;}
