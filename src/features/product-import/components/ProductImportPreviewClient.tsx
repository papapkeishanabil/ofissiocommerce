"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileArchive, FileSearch, FileUp, History, LoaderCircle, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { createProductImportPreview } from "../product-import.service";
import { startProductImportChunkUpload, type ProductImportUploadSession } from "../product-import-upload.client";
import { validateProductImportZipSelection } from "../product-import-upload.policy";
import type { ProductImportDecisions, ProductImportDryRunResult, ProductImportPreview, ZipVerificationResult } from "../product-import.types";
import { ProductImportDryRunReview } from "./ProductImportDryRunReview";

const MAX_CSV_BYTES = 15 * 1024 * 1024;
const STEPS = ["Product Data", "Photo Manifest", "Review", "Photo ZIP", "Dry Run", "Import", "Result"];
const FILTERS = [["all", "Semua"], ["ready", "Ready"], ["warning", "Warning"], ["error", "Error"], ["new", "Produk baru"], ["missing", "Foto hilang"]] as const;

function validateCsv(file: File | null, label: string) {
  if (!file) throw new Error(`Pilih ${label}.`);
  if (!file.name.toLowerCase().endsWith(".csv")) throw new Error(`${label} harus berupa file CSV.`);
  if (file.size > MAX_CSV_BYTES) throw new Error(`${label} maksimal 15 MB.`);
  return file;
}
function formatFileSize(bytes: number) { return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`; }

type UploadState = "LOCAL_ONLY" | "READY_TO_UPLOAD" | "UPLOADING" | "PAUSED" | "UPLOADED" | "VERIFYING" | "VERIFIED" | "UPLOAD_FAILED";

type RecoveryInfo={batchId:string;recoveryState:string;status?:string;zipFilename:string;zipSizeBytes:number;requiresSourceFiles:boolean;dryRunError?:{code:string;message:string}|null};
export function ProductImportPreviewClient({ maxZipBytes, recoveryBatchId=null }: { maxZipBytes: number; recoveryBatchId?:string|null }) {
  const [wooFile, setWooFile] = useState<File | null>(null);
  const [manifestFile, setManifestFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ProductImportPreview | null>(null);
  const [zipStepOpen, setZipStepOpen] = useState(false);
  const [zipVerification, setZipVerification] = useState<ZipVerificationResult | null>(null);
  const [uploadSession, setUploadSession] = useState<ProductImportUploadSession | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("LOCAL_ONLY");
  const [uploadProgress, setUploadProgress] = useState({ uploaded: 0, total: 0, chunks: 0, totalChunks: 0 });
  const pauseUploadRef = useRef<(() => void) | null>(null);
  const [dryRun, setDryRun] = useState<ProductImportDryRunResult | null>(null);
  const [decisions, setDecisions] = useState<ProductImportDecisions>({ skuNormalizations: {}, variantMappings: {} });
  const [importApproved, setImportApproved] = useState(false);
  const [importResult, setImportResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [recoveryInfo,setRecoveryInfo]=useState<RecoveryInfo|null>(null);

  useEffect(()=>{if(!recoveryBatchId)return;let active=true;void fetch(`/api/admin/products/import/recovery?batchId=${encodeURIComponent(recoveryBatchId)}`,{cache:"no-store"}).then(async response=>{const body=await response.json() as {message?:string;result?:RecoveryInfo};if(!response.ok||!body.result)throw new Error(body.message||"Batch belum dapat dipulihkan.");if(active)setRecoveryInfo(body.result);}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:"Batch belum dapat dipulihkan.");});return()=>{active=false;};},[recoveryBatchId]);

  function resetWorkflow() {
    if(!recoveryBatchId)void cancelStagedUpload();
    setPreview(null); setZipStepOpen(false); setZipFile(null); setZipVerification(null); setDryRun(null);
    setImportApproved(false); setImportResult(null); setDecisions({ skuNormalizations: {}, variantMappings: {} }); setError(null);
  }
  async function restoreVerifiedBatch(){
    if(!recoveryBatchId)return;setError(null);
    try{const woo=validateCsv(wooFile,"WooCommerce Product CSV");const manifest=validateCsv(manifestFile,"Photo Product Manifest");const form=new FormData();form.set("batchId",recoveryBatchId);form.set("wooCsv",woo);form.set("manifestCsv",manifest);const response=await fetch("/api/admin/products/import/recovery",{method:"POST",body:form});const body=await response.json() as {message?:string;result?:RecoveryInfo&{preview:ProductImportPreview;verification:ZipVerificationResult;decisions:ProductImportDecisions;plan?:ProductImportDryRunResult["plan"]|null}};if(!response.ok||!body.result)throw new Error(body.message||"Batch belum dapat dipulihkan.");const recovered=body.result;setRecoveryInfo(recovered);setPreview(recovered.preview);setZipVerification(recovered.verification);setDecisions(recovered.decisions);setDryRun(recovered.status==="DRY_RUN_PASSED"&&recovered.plan?{batchId:recovered.batchId,status:"DRY_RUN_PASSED",zip:recovered.verification,plan:recovered.plan}:null);setZipStepOpen(true);setUploadState("VERIFIED");setUploadSession({batchId:recoveryBatchId,uploadId:"recovered",chunkSize:0,totalChunks:0,uploadedChunks:[],maxZipBytes,provider:"local"});setUploadProgress({uploaded:recovered.zipSizeBytes,total:recovered.zipSizeBytes,chunks:0,totalChunks:0});}
    catch(cause){setError(cause instanceof Error?cause.message:"Batch belum dapat dipulihkan.");}
  }
  async function cancelStagedUpload() {
    pauseUploadRef.current?.(); pauseUploadRef.current = null;
    if (uploadSession?.batchId) await fetch("/api/admin/products/import/cancel", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batchId: uploadSession.batchId }) }).catch(() => undefined);
    setUploadSession(null); setUploadProgress({ uploaded: 0, total: 0, chunks: 0, totalChunks: 0 });
  }
  async function selectZip(file: File | null) {
    await cancelStagedUpload(); setZipFile(file); setZipVerification(null); setDryRun(null); setImportApproved(false); setError(null);
    if (!file) return setUploadState("LOCAL_ONLY");
    if (!validateProductImportZipSelection(file, maxZipBytes).ok) {
      setUploadState("LOCAL_ONLY");
      return setError(`ZIP terlalu besar atau format tidak valid. Selected: ${file.name} (${formatFileSize(file.size)}). Maximum: ${formatFileSize(maxZipBytes)}.`);
    }
    setUploadState("READY_TO_UPLOAD"); setUploadProgress({ uploaded: 0, total: file.size, chunks: 0, totalChunks: 0 });
  }
  async function uploadZip() {
    setError(null);
    if (!wooFile || !manifestFile || !zipFile || !new Set(["READY_TO_UPLOAD","PAUSED","UPLOAD_FAILED"]).has(uploadState)) return;
    try {
      let session=uploadSession;
      if(!session){const form=new FormData();form.set("wooCsv",wooFile);form.set("manifestCsv",manifestFile);form.set("zipFilename",zipFile.name);form.set("zipSizeBytes",String(zipFile.size));const preparedResponse=await fetch("/api/admin/products/import/prepare-upload",{method:"POST",body:form});const preparedBody=await preparedResponse.json() as {message?:string;result?:ProductImportUploadSession};if(!preparedResponse.ok||!preparedBody.result)throw new Error(preparedBody.message||"Upload belum dapat disiapkan.");session=preparedBody.result;setUploadSession(session);}
      setUploadState("UPLOADING");
      const transfer=startProductImportChunkUpload({file:zipFile,session,onProgress:(uploaded,total,chunks,totalChunks)=>setUploadProgress({uploaded,total,chunks,totalChunks})});pauseUploadRef.current=transfer.pause;await transfer.promise;pauseUploadRef.current=null;
      const completeResponse = await fetch("/api/admin/products/import/upload-complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batchId: session.batchId, uploadId: session.uploadId }) });
      const completeBody = await completeResponse.json() as { message?: string };
      if (!completeResponse.ok) throw new Error(completeBody.message || "Upload ZIP belum lengkap.");
      setUploadProgress({ uploaded: zipFile.size, total: zipFile.size, chunks: session.totalChunks, totalChunks: session.totalChunks }); setUploadState("UPLOADED");
    } catch (cause) {
      if(cause instanceof DOMException&&cause.name==="AbortError"){setUploadState("PAUSED");setError(null);return;}
      setUploadState("UPLOAD_FAILED"); setError(cause instanceof Error?cause.message:"Upload ZIP gagal. Data chunk yang selesai tetap tersimpan untuk Retry.");
    }
  }
  async function analyze() {
    setError(null);
    try {
      const woo = validateCsv(wooFile, "WooCommerce Product CSV");
      const manifest = validateCsv(manifestFile, "Photo Product Manifest");
      const [wooCsv, manifestCsv] = await Promise.all([woo.text(), manifest.text()]);
      startTransition(() => {
        try { setPreview(createProductImportPreview(wooCsv, manifestCsv)); setZipStepOpen(false); setZipVerification(null); setDryRun(null); setDecisions({ skuNormalizations: {}, variantMappings: {} }); }
        catch (cause) { setError(cause instanceof Error ? cause.message : "File belum dapat dianalisis."); }
      });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "File belum dapat dianalisis."); }
  }
  async function verifyZip() {
    setError(null); setZipVerification(null); setDryRun(null);
    if (!wooFile || !manifestFile || !zipFile || !uploadSession || uploadState !== "UPLOADED") return setError("Upload Photo Product ZIP harus selesai terlebih dahulu.");
    const form = new FormData(); form.set("wooCsv", wooFile); form.set("manifestCsv", manifestFile); form.set("batchId", uploadSession.batchId); setUploadState("VERIFYING");
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/products/import/verify-zip", { method: "POST", body: form });
        const body = await response.json() as { message?: string; result?: ZipVerificationResult };
        if (!response.ok || !body.result) throw new Error(body.message || "Verifikasi ZIP gagal.");
        setZipVerification(body.result); setUploadState("VERIFIED");
      } catch (cause) { setUploadState("UPLOADED"); setError(cause instanceof Error ? cause.message : "Verifikasi ZIP gagal."); }
    });
  }
  const specialItems = preview?.products.filter((item) => item.suggestedSku || item.variantPhotos.some((variant) => !variant.exact)) ?? [];
  const confirmationsComplete = specialItems.every((item) => (!item.suggestedSku || decisions.skuNormalizations[item.key]) && item.variantPhotos.filter((variant) => !variant.exact).every((variant) => decisions.variantMappings[`${item.key}:${variant.hint}`]));
  const zipBlocked = Boolean(zipVerification && (zipVerification.summary.missing > 0 || zipVerification.summary.sizeMismatch > 0));

  async function runDryRun() {
    setError(null); setDryRun(null);
    if (!preview || preview.summary.errorEvents > 0 || !zipVerification || zipBlocked || !confirmationsComplete) return setError("Selesaikan verifikasi ZIP dan seluruh konfirmasi khusus terlebih dahulu.");
    if (!wooFile || !manifestFile || !uploadSession) return setError("File import belum lengkap.");
    const form = new FormData(); form.set("batchId", uploadSession.batchId); form.set("wooCsv", wooFile); form.set("manifestCsv", manifestFile); form.set("decisions", JSON.stringify(decisions));
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/products/import/dry-run", { method: "POST", body: form });
        const body = await response.json() as { message?: string; result?: ProductImportDryRunResult };
        if (!response.ok || !body.result) throw new Error(body.message || "Dry run gagal.");
        setDryRun(body.result);
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Dry run gagal."); }
    });
  }
  async function executeImport() {
    if (!dryRun || dryRun.status !== "DRY_RUN_PASSED" || !importApproved || !wooFile || !manifestFile) return;
    setError(null); const form = new FormData(); form.set("batchId", dryRun.batchId); form.set("wooCsv", wooFile); form.set("manifestCsv", manifestFile);
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/products/import/execute", { method: "POST", body: form });
        const body = await response.json() as { message?: string; result?: Record<string, unknown> };
        if (!response.ok || !body.result) throw new Error(body.message || "Import draft gagal."); setImportResult(body.result);
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Import draft gagal."); }
    });
  }
  const currentStep = importResult ? 7 : dryRun ? 6 : zipVerification ? 5 : zipStepOpen ? 4 : preview ? 3 : manifestFile ? 2 : 1;
  const rows = useMemo(() => preview?.products.filter((item) => {
    const text = `${item.normalizedSku} ${item.sourceSku ?? ""} ${item.product?.name ?? ""}`.toLowerCase();
    const matchesQuery = !query || text.includes(query.toLowerCase());
    const matchesFilter = filter === "all" || (filter === "ready" && item.isReadyForImport && item.status === "MATCHED") || (filter === "warning" && item.issues.some((issue) => issue.severity === "WARNING")) || (filter === "error" && item.issues.some((issue) => issue.severity === "ERROR")) || (filter === "new" && item.status === "PRODUCT_MISSING") || (filter === "missing" && item.status === "PHOTO_MISSING");
    return matchesQuery && matchesFilter;
  }) ?? [], [preview, filter, query]);

  return <div className="space-y-6">
    <StepIndicator current={currentStep} />
    {recoveryInfo?<section className={`rounded-xl border p-5 ${recoveryInfo.recoveryState==="RECOVERABLE"?"border-emerald-200 bg-emerald-50":"border-amber-200 bg-amber-50"}`}><p className="text-xs font-black uppercase tracking-wider">Recovery batch</p><h2 className="mt-1 text-lg font-black">{recoveryInfo.zipFilename}, {formatFileSize(recoveryInfo.zipSizeBytes)}</h2><p className="mt-2 font-bold">{recoveryInfo.recoveryState==="RECOVERABLE"?"ZIP VERIFIED — file staging valid dan tidak perlu diunggah ulang.":recoveryInfo.recoveryState}</p>{recoveryInfo.recoveryState==="RECOVERABLE"?<><p className="mt-2 text-sm">Pilih kembali hanya CSV WooCommerce dan Photo Manifest untuk mencocokkan hash sumber, lalu lanjutkan ke Retry Dry Run.</p><button type="button" onClick={restoreVerifiedBatch} disabled={pending||!wooFile||!manifestFile} className="mt-4 min-h-11 rounded-lg bg-brand-700 px-5 text-sm font-bold text-white disabled:bg-slate-300">Continue verified ZIP</button></>:null}</section>:recoveryBatchId?<p className="rounded-xl border border-line bg-white p-5 text-sm">Memvalidasi batch dan SHA-256 source.zip…</p>:null}
    <section className="grid gap-4 lg:grid-cols-2">
      <UploadCard step="1" title="WooCommerce Product CSV" file={wooFile} onChange={(file) => { setWooFile(file); resetWorkflow(); }} />
      <UploadCard step="2" title="Photo Product Manifest" file={manifestFile} onChange={(file) => { setManifestFile(file); resetWorkflow(); }} />
    </section>
    <section className="flex flex-col gap-3 rounded-xl border border-brand-100 bg-brand-50/50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-brand-700" aria-hidden /><div><p className="font-semibold text-ink">Analisis Phase 1 tetap preview-only</p><p className="text-sm text-ink-muted">Belum ada produk, variation, atau media permanen yang dibuat.</p></div></div><button type="button" onClick={analyze} disabled={pending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 text-sm font-bold text-white disabled:opacity-60">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}Analisis Import</button></section>
    {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div> : null}
    {preview ? <>
      <PreviewSummary preview={preview} />
      <PreviewTable rows={rows} filter={filter} query={query} setFilter={setFilter} setQuery={setQuery} />
      {!zipStepOpen && preview.summary.errorEvents === 0 ? <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center"><CheckCircle2 className="mx-auto h-7 w-7 text-emerald-700" /><h3 className="mt-2 text-lg font-black text-emerald-950">Review selesai tanpa blocking error</h3><p className="mt-1 text-sm text-emerald-900">Lanjutkan untuk mencocokkan file fisik di Photo Product ZIP.</p><button type="button" onClick={() => setZipStepOpen(true)} className="mt-4 min-h-11 rounded-lg bg-brand-700 px-5 text-sm font-bold text-white">Continue to Photo ZIP</button></section> : null}
      {preview.summary.errorEvents > 0 ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">Photo ZIP belum dapat dilanjutkan karena preview masih memiliki {preview.summary.errorEvents} error.</div> : null}
      {zipStepOpen ? <section className="space-y-4 rounded-xl border border-brand-200 bg-white p-5 shadow-soft-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-brand-700">Step 4</p><h3 className="mt-1 text-lg font-black text-ink">Photo Product ZIP</h3><p className="mt-1 text-sm text-ink-muted">ZIP diverifikasi di server dan tidak diekstrak manual ke komputer.</p></div><Link href="/admin/products/import/history" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line px-4 text-sm font-bold"><History className="h-4 w-4" />Riwayat import</Link></div>
        {uploadState!=="VERIFIED"?<label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-brand-200 p-4"><FileArchive className="h-6 w-6 text-brand-700" /><span><b className="block">Pilih file ZIP</b><span className="text-sm text-ink-muted">{zipFile ? `${zipFile.name}, ${formatFileSize(zipFile.size)}` : `.zip saja, maksimal ${formatFileSize(maxZipBytes)}`}</span></span><input type="file" accept=".zip,application/zip" className="sr-only" disabled={uploadState === "UPLOADING" || uploadState === "VERIFYING"} onChange={(event) => void selectZip(event.target.files?.[0] ?? null)} /></label>:<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><b>ZIP VERIFIED</b><p className="mt-1 text-sm">{recoveryInfo?.zipFilename??zipFile?.name}, staging lokal tervalidasi. Upload ZIP dilewati.</p></div>}
        {zipFile ? <div aria-live="polite" className="rounded-xl border border-line bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-ink">{uploadStateLabel(uploadState)}</p><p className="mt-1 text-sm text-ink-muted">{formatFileSize(uploadProgress.uploaded)} / {formatFileSize(uploadProgress.total || zipFile.size)}{uploadState === "UPLOADING" ? `, ${Math.round((uploadProgress.uploaded / Math.max(uploadProgress.total, 1)) * 100)}%` : ""}</p>{uploadProgress.totalChunks>0?<p className="mt-1 text-xs font-semibold text-ink-muted">Chunks: {uploadProgress.chunks} / {uploadProgress.totalChunks}</p>:null}</div><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-brand-800">{uploadState}</span></div>{uploadState === "UPLOADING" ? <progress aria-label="Progress upload ZIP" className="mt-3 h-3 w-full" max={Math.max(uploadProgress.total, 1)} value={uploadProgress.uploaded} /> : null}<div className="mt-3 flex flex-wrap gap-2">{new Set(["READY_TO_UPLOAD","PAUSED","UPLOAD_FAILED"]).has(uploadState) ? <button type="button" onClick={uploadZip} className="min-h-11 rounded-lg bg-brand-700 px-5 text-sm font-bold text-white">{uploadState==="PAUSED"?"Resume upload":uploadState==="UPLOAD_FAILED"?"Retry upload":"Upload ZIP"}</button> : null}{uploadState === "UPLOADING" ? <button type="button" onClick={()=>{pauseUploadRef.current?.();setUploadState("PAUSED");}} className="min-h-11 rounded-lg border border-amber-200 bg-white px-5 text-sm font-bold text-amber-800">Pause</button> : null}{uploadSession&&new Set(["UPLOADING","PAUSED","UPLOAD_FAILED"]).has(uploadState)?<button type="button" onClick={() => void cancelStagedUpload().then(() => { setUploadState("READY_TO_UPLOAD"); setError(null); })} className="min-h-11 rounded-lg border border-red-200 bg-white px-5 text-sm font-bold text-red-700">Cancel &amp; delete</button>:null}{uploadState === "UPLOADED" ? <button type="button" onClick={verifyZip} disabled={pending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 text-sm font-bold text-white disabled:opacity-50">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}Verify ZIP</button> : null}</div></div> : null}
        {zipVerification ? <ZipResult result={zipVerification} blocked={zipBlocked} /> : null}
        {zipVerification && !zipBlocked ? <SpecialConfirmations items={specialItems} decisions={decisions} setDecisions={setDecisions} /> : null}
        {zipVerification && !zipBlocked ? <div className="border-t border-line pt-4"><p className="text-xs font-black uppercase tracking-wider text-brand-700">Step 5</p><h3 className="mt-1 text-lg font-black text-ink">Dry Run</h3><p className="mt-1 text-sm text-ink-muted">Dry run berjalan server-side tanpa permanent write.</p>{recoveryInfo?.dryRunError?<p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">Percobaan sebelumnya gagal: {recoveryInfo.dryRunError.message}. ZIP tetap tersimpan dan dapat digunakan kembali.</p>:null}<button type="button" onClick={runDryRun} disabled={pending || !confirmationsComplete} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-500">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{recoveryBatchId?"Retry Dry Run":"Run Dry Run"}</button>{!confirmationsComplete ? <p className="mt-2 text-xs font-semibold text-amber-800">Selesaikan seluruh special confirmation.</p> : null}</div> : null}
      </section> : null}
      {dryRun ? <DryRunResult result={dryRun} approved={importApproved} onApproved={setImportApproved} pending={pending} onExecute={executeImport} /> : null}
      {importResult ? <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><h3 className="text-xl font-black text-emerald-900">IMPORT COMPLETED</h3><pre className="mt-3 overflow-auto rounded-lg bg-white p-4 text-xs">{JSON.stringify(importResult, null, 2)}</pre></section> : null}
    </> : null}
  </div>;
}

function StepIndicator({ current }: { current: number }) { return <ol aria-label="Tahapan bulk product import" className="grid gap-2 rounded-xl border border-line bg-white p-3 sm:grid-cols-4 xl:grid-cols-7">{STEPS.map((label, index) => { const number = index + 1; const active = number === current; const done = number < current; return <li key={label} aria-current={active ? "step" : undefined} className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-bold ${active ? "bg-brand-700 text-white" : done ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-ink-muted"}`}><span>{done ? "✓" : number}</span><span>{label}</span></li>; })}</ol>; }
function uploadStateLabel(state: UploadState) { return ({ LOCAL_ONLY: "Local only", READY_TO_UPLOAD: "Ready to upload", UPLOADING: "Uploading ZIP", PAUSED:"Upload paused", UPLOADED: "Upload complete", VERIFYING: "Verifying ZIP", VERIFIED: "ZIP verified", UPLOAD_FAILED: "Upload failed — retry akan melanjutkan chunk yang tersisa" })[state]; }
function UploadCard({ step, title, file, onChange }: { step: string; title: string; file: File | null; onChange: (file: File | null) => void }) { return <label className="cursor-pointer rounded-xl border border-dashed border-brand-200 bg-white p-5 shadow-soft-sm"><span className="text-xs font-black uppercase tracking-wider text-brand-700">Step {step}</span><span className="mt-2 flex items-center gap-3"><span className="rounded-lg bg-brand-50 p-3 text-brand-700"><FileUp className="h-5 w-5" /></span><span><b className="block text-ink">{title}</b><span className="text-sm text-ink-muted">{file?.name ?? "Pilih file CSV, maks. 15 MB"}</span></span></span><input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => onChange(event.target.files?.[0] ?? null)} /></label>; }
function SummaryGroup({ title, metrics }: { title: string; metrics: Record<string, number> }) { return <div className="rounded-xl border border-line bg-white p-4 shadow-soft-sm"><h3 className="text-sm font-black uppercase tracking-wide text-brand-800">{title}</h3><dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{Object.entries(metrics).map(([label, value]) => <div key={label}><dt className="text-[10px] font-bold uppercase leading-4 tracking-wide text-ink-muted">{label}</dt><dd className="mt-1 text-2xl font-black tabular-nums text-ink">{value}</dd></div>)}</dl></div>; }
function PreviewSummary({ preview }: { preview: ProductImportPreview }) { return <section className="grid gap-4 xl:grid-cols-2"><SummaryGroup title="WooCommerce" metrics={{ "Woo rows": preview.summary.wooRows, "Parent products": preview.summary.parentProducts, Variable: preview.summary.variableProducts, Variations: preview.summary.variations }} /><SummaryGroup title="Local photos" metrics={{ "Photo folders": preview.summary.photoFolders, "Base photo SKUs": preview.summary.basePhotoSkus, "Total images": preview.summary.totalImageFiles, "Assigned images": preview.summary.assignedImages, "Unassigned images": preview.summary.unassignedImages }} /><SummaryGroup title="Matching" metrics={{ "Local photo matched": preview.summary.localPhotoMatchedProducts, "Photo-only": preview.summary.photoOnlyProducts, "Legacy photo only": preview.summary.legacyPhotoOnlyProducts, "No photo": preview.summary.noPhotoProducts }} /><SummaryGroup title="Validation" metrics={{ "Products with warnings": preview.summary.productsWithWarnings, "Warning events": preview.summary.warningEvents, "Products with errors": preview.summary.productsWithErrors, "Error events": preview.summary.errorEvents }} /></section>; }
function PreviewTable({ rows, filter, query, setFilter, setQuery }: { rows: ProductImportPreview["products"]; filter: string; query: string; setFilter: (value: string) => void; setQuery: (value: string) => void }) { return <section className="rounded-xl border border-line bg-white shadow-soft-sm"><div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="font-black">Step 3, Review &amp; Validation</h3><div className="mt-2 flex flex-wrap gap-2">{FILTERS.map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-9 rounded-lg px-3 text-xs font-bold ${filter === value ? "bg-brand-700 text-white" : "border border-line"}`}>{label}</button>)}</div></div><label className="flex min-h-10 items-center gap-2 rounded-lg border border-line px-3"><Search className="h-4 w-4" /><span className="sr-only">Cari SKU atau produk</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari SKU / nama produk" className="w-60 bg-transparent text-sm outline-none" /></label></div><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-ink-muted"><tr>{["Status", "SKU", "Produk", "Type", "Variations", "Photos", "Variant photos", "Issues"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-line">{rows.map((item) => <tr key={item.key}><td className="px-4 py-4"><Status status={item.status} /></td><td className="px-4 py-4 font-mono font-bold">{item.suggestedSku ?? item.normalizedSku}{item.suggestedSku ? <span className="block text-xs font-normal text-amber-700">Woo: {item.sourceSku}</span> : null}</td><td className="px-4 py-4 font-semibold">{item.product?.name ?? "Kandidat produk baru"}</td><td className="px-4 py-4">{item.product?.productType ?? "—"}</td><td className="px-4 py-4">{item.variations.length}</td><td className="px-4 py-4">{item.images.length}<span className="block text-xs text-ink-muted">{item.photoSource}</span></td><td className="px-4 py-4">{item.variantPhotos.map((variant) => <span key={variant.hint} className="block text-xs">{variant.hint} → {variant.matchedValue ?? "review"} ({variant.count})</span>)}</td><td className="px-4 py-4">{item.issues.filter((issue) => issue.severity !== "INFO").length}</td></tr>)}</tbody></table></div></section>; }
function Status({ status }: { status: string }) { const bad = status === "DUPLICATE_IMAGE_FOLDER" || status === "INVALID_SKU"; const warning = status === "MATCHED_WITH_WARNING" || status === "PHOTO_MISSING"; return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black ${bad ? "bg-red-50 text-red-700" : warning ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>{bad || warning ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}{bad ? "ERROR" : warning ? "WARNING" : status === "PRODUCT_MISSING" ? "NEW PRODUCT" : "READY"}</span>; }
function ZipResult({ result, blocked }: { result: ZipVerificationResult; blocked: boolean }) { const s = result.summary; const blockedItems = result.items.filter((item) => item.status === "MISSING_FROM_ZIP" || item.status === "SIZE_MISMATCH"); return <div className={`space-y-3 rounded-xl border p-4 ${blocked ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}><div className="flex items-center gap-2 font-black">{blocked ? <AlertTriangle className="h-5 w-5 text-red-700" /> : <CheckCircle2 className="h-5 w-5 text-emerald-700" />}{blocked ? "ZIP verification blocked" : "ZIP verification passed"}</div><SummaryGroup title="ZIP verification result" metrics={{ "Manifest images": s.manifestImages, "ZIP matched": s.matched, Missing: s.missing, Unexpected: s.unexpected, "Size mismatch": s.sizeMismatch, "Ignored GLB": s.glbIgnored, "Ignored MP4": s.videosIgnored, "Blocked/security errors": blockedItems.length }} />{blockedItems.map((item) => <p key={`${item.path}-${item.status}`} className="break-all text-xs font-semibold text-red-800">{item.status}: {item.path}</p>)}</div>; }
function SpecialConfirmations({ items, decisions, setDecisions }: { items: ProductImportPreview["products"]; decisions: ProductImportDecisions; setDecisions: React.Dispatch<React.SetStateAction<ProductImportDecisions>> }) { return <div className="space-y-3"><div><p className="text-xs font-black uppercase tracking-wider text-brand-700">Special confirmations</p><p className="mt-1 text-sm text-ink-muted">Exact mapping seperti MERAH → Merah tidak memerlukan konfirmasi.</p></div>{items.length ? items.map((item) => <div key={item.key} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">{item.suggestedSku ? <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={Boolean(decisions.skuNormalizations[item.key])} onChange={(event) => setDecisions((current) => ({ ...current, skuNormalizations: { ...current.skuNormalizations, [item.key]: event.target.checked } }))} /><span><b>Woo source SKU {item.sourceSku} → target {item.suggestedSku}</b><span className="block text-xs text-amber-800">Confirm normalization.</span></span></label> : null}{item.variantPhotos.filter((variant) => !variant.exact).map((variant) => <label key={variant.hint} className="mt-2 flex items-start gap-2"><input type="checkbox" className="mt-1" checked={Boolean(decisions.variantMappings[`${item.key}:${variant.hint}`])} onChange={(event) => setDecisions((current) => ({ ...current, variantMappings: { ...current.variantMappings, [`${item.key}:${variant.hint}`]: event.target.checked } }))} /><span><b>Folder {variant.hint} → variant {variant.matchedValue ?? "belum ditemukan"}</b><span className="block text-xs text-amber-800">{variant.count} gambar, Confirm mapping.</span></span></label>)}</div>) : <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Tidak ada fuzzy mapping yang perlu dikonfirmasi.</p>}</div>; }
function DryRunResult({ result, approved, onApproved, pending, onExecute }: { result: ProductImportDryRunResult; approved: boolean; onApproved: (value: boolean) => void; pending: boolean; onExecute: () => void }) { const s = result.plan.summary; const ready = result.status === "DRY_RUN_PASSED" && s.blocked === 0 && (s.imagesBlocked??0)===0 && (s.variationsBlocked??0)===0; const totalImages=s.localImages+s.legacyImages; return <div className="space-y-5"><section className={`space-y-5 rounded-xl border p-5 ${ready ? "border-emerald-200 bg-emerald-50/40" : "border-red-200 bg-red-50/40"}`}><div><p className="text-xs font-black uppercase text-ink-muted">Batch {result.batchId}</p><h3 className="mt-1 text-xl font-black">{ready ? "DRY RUN PASSED" : "DRY RUN BLOCKED"}</h3><p className="mt-1 text-sm text-ink-muted">Production Dry Run berhenti di sini untuk review. Tidak ada permanent write.</p></div><SummaryGroup title="Import plan" metrics={{ "Products analyzed": s.productsAnalyzed, CREATE_DRAFT: s.createDraft, SKIP_EXISTING: s.skipExisting, SKIP_NEEDS_PRODUCT_DATA: s.skipNeedsProductData, SKIP_UNSUPPORTED: s.skipUnsupported, BLOCKED: s.blocked, "Variations ready": s.variationsReady, "Local images": s.localImages }} /></section><ProductImportDryRunReview plan={result.plan}/><section className="rounded-xl border border-brand-200 bg-white p-5"><h3 className="font-black text-ink">Production import will</h3><p className="mt-2 text-sm leading-6 text-ink-muted">Create <b>{s.createDraft}</b> draft products and <b>{s.variationsReady}</b> variations; skip <b>{s.skipExisting}</b> existing, <b>{s.skipNeedsProductData}</b> needing data, and <b>{s.skipUnsupported}</b> unsupported products; upload/copy <b>{totalImages}</b> product images. Blocked: <b>{s.blocked}</b>.</p><label className="mt-4 flex min-h-11 items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={approved} onChange={(event) => onApproved(event.target.checked)} disabled={!ready} /><span>Saya sudah mereview production dry run.</span></label><button type="button" onClick={onExecute} disabled={!ready || !approved || pending} className="mt-3 min-h-11 rounded-lg bg-brand-700 px-4 text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-500">{pending ? "Memproses…" : "IMPORT AS DRAFT"}</button>{!ready?<p role="alert" className="mt-2 text-sm font-semibold text-red-700">Import dinonaktifkan karena plan masih memiliki blocker produk, variasi, atau gambar.</p>:null}</section></div>; }
