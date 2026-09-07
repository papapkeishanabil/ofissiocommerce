import { notFound } from "next/navigation";
import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { AdminBackLink, AdminPageHeader } from "@/features/admin/components/AdminSurface";
import { ProductImportDryRunReview } from "@/features/product-import/components/ProductImportDryRunReview";
import { ProductImportRetryFailed } from "@/features/product-import/components/ProductImportRetryFailed";
import { ProductImportPartialRecovery } from "@/features/product-import/components/ProductImportPartialRecovery";
import { inspectPartialImportProducts } from "@/features/product-import/product-import-partial-recovery.service";
import { productImportRepository } from "@/features/product-import/product-import.repository";
import type { ProductImportPlan } from "@/features/product-import/product-import.types";
import type { ProductImportPreview } from "@/features/product-import/product-import.types";
import { enrichProductImportPlan } from "@/features/product-import/product-import-plan-review";

export const dynamic = "force-dynamic";

export default async function ImportBatchDetailPage({params}:{params:Promise<{id:string}>}){
  const actor=await requireInternalAdminServer("admin:catalog:view");
  const {id}=await params;
  const batch=await productImportRepository.assertOwnedBatch(id,actor.id).catch(()=>null);if(!batch)notFound();
  const items=await productImportRepository.listItems(id);
  const storedPlan=batch.plan_json as ProductImportPlan|null;
  const result=batch.result_json&&typeof batch.result_json==="object"&&!Array.isArray(batch.result_json)?batch.result_json as Record<string,unknown>:null;
  const preview=result?.preview as ProductImportPreview|undefined;
  const plan=storedPlan?.batchId&&preview?enrichProductImportPlan(storedPlan,preview):storedPlan;
  const failedItems=items.filter(item=>item.status==="FAILED").map(item=>({sourceId:String(item.source_id),sku:String(item.target_sku??item.source_sku??"—"),name:String((item.metadata as Record<string,unknown>)?.name??item.target_sku??"Produk"),error:String(item.error_message??"Error belum tersedia."),updatedAt:String(item.updated_at??"")}));
  const importedCount=items.filter(item=>item.status==="IMPORTED").length,skippedCount=items.filter(item=>item.status==="SKIPPED").length;
  const attempts=Array.isArray(result?.attempts)?result.attempts as Array<Record<string,unknown>>:result?.attempt?[result.attempt as Record<string,unknown>]:[];
  const partialCandidates=String(batch.status)==="COMPLETED_WITH_WARNINGS"?await inspectPartialImportProducts({batch,items}):[];
  const partialSourceIds=new Set(partialCandidates.filter(candidate=>candidate.state==="PARTIAL_IMPORT_PRODUCT").map(candidate=>candidate.sourceId));
  const retryItems=failedItems.filter(item=>!partialSourceIds.has(item.sourceId));
  return <div className="space-y-6">
    <AdminBackLink href="/admin/products/import/history">Kembali ke riwayat</AdminBackLink>
    <AdminPageHeader eyebrow={`Batch ${id}`} title={String(batch.status)} description="Detail keputusan server-side per produk. Riwayat ini tidak menjadi repository katalog."/>
    {partialCandidates.length?<ProductImportPartialRecovery batchId={id} candidates={partialCandidates} csvFilename={String(batch.csv_filename)} manifestFilename={String(batch.manifest_filename)}/>:null}
    {String(batch.status)==="COMPLETED_WITH_WARNINGS"&&retryItems.length?<ProductImportRetryFailed batchId={id} failedItems={retryItems} importedCount={importedCount} skippedCount={skippedCount} csvFilename={String(batch.csv_filename)} manifestFilename={String(batch.manifest_filename)} attempts={attempts}/>:null}
    {plan?.batchId?<ProductImportDryRunReview plan={plan}/>:<LegacyItemTable items={items}/>} 
  </div>;
}

function LegacyItemTable({items}:{items:Array<Record<string,unknown>>}){return <section className="overflow-x-auto rounded-xl border border-line bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-ink-muted"><tr>{["SKU sumber","SKU target","Action","Status","Alasan"].map(label=><th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-line">{items.map(row=><tr key={String(row.id)}><td className="px-4 py-3">{String(row.source_sku??"—")}</td><td className="px-4 py-3">{String(row.target_sku??"—")}</td><td className="px-4 py-3 font-bold">{String(row.action)}</td><td className="px-4 py-3">{String(row.status)}</td><td className="px-4 py-3 text-ink-muted">{String((row.metadata as Record<string,unknown>)?.reason??"")}</td></tr>)}</tbody></table></section>}
