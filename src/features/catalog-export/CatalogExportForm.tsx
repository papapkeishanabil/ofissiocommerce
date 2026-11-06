"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Eye, FileText, LoaderCircle, Search } from "lucide-react";
import { AdminCard } from "@/features/admin/components/AdminSurface";
import type { CatalogExportOptions } from "./catalog-export.schema";

interface ProductChoice { id:number; name:string; sku:string; categories:{ id:number; name:string }[] }
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

export function CatalogExportForm({ products }: { products: ProductChoice[] }) {
  const [scope,setScope]=useState<CatalogExportOptions["scope"]>("all");
  const [categoryIds,setCategoryIds]=useState<number[]>([]);
  const [productIds,setProductIds]=useState<number[]>([]);
  const [includeVariants,setIncludeVariants]=useState(true);
  const [showPrices,setShowPrices]=useState(false);
  const [query,setQuery]=useState("");
  const [busy,setBusy]=useState<"preview"|"pdf"|null>(null);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [preview,setPreview]=useState("");
  const [previewUrl,setPreviewUrl]=useState("");
  const [downloadUrl,setDownloadUrl]=useState("");
  const controller=useRef<AbortController|null>(null);
  const urlRef=useRef("");
  useEffect(() => () => { controller.current?.abort(); if(urlRef.current)URL.revokeObjectURL(urlRef.current); },[]);
  const categories=[...new Map(products.flatMap(p => p.categories).map(c => [c.id,c])).values()].sort((a,b)=>a.name.localeCompare(b.name,"id"));
  const filtered=products.filter(p=>`${p.name} ${p.sku}`.toLocaleLowerCase("id").includes(query.toLocaleLowerCase("id")));
  const count=products.filter(p=>scope==="all" || (scope==="selected" ? productIds.includes(p.id) : p.categories.some(c=>categoryIds.includes(c.id)))).length;
  function clearPreview() {
    setPreview("");setPreviewUrl("");setDownloadUrl("");setError("");setMessage("");
    if(urlRef.current){URL.revokeObjectURL(urlRef.current);urlRef.current="";}
  }
  function toggle(id:number,current:number[],update:(v:number[])=>void){clearPreview();update(current.includes(id)?current.filter(x=>x!==id):[...current,id]);}
  async function run(format:"preview"|"pdf") {
    setError("");setMessage("");setDownloadUrl("");setBusy(format);
    const abort=new AbortController();controller.current=abort;
    try {
      const response=await fetch("/api/admin/products/catalog",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({scope,categoryIds,productIds,includeVariants,showPrices,format,delivery:format==="pdf"?"link":"attachment"}),signal:abort.signal});
      if(!response.ok){const data=await response.json().catch(()=>null);throw new Error(data?.message||"Katalog belum dapat dibuat. Silakan coba lagi.");}
      const pages=response.headers.get("X-Catalog-Pages");
      const warningCount=Number(response.headers.get("X-Catalog-Warnings")||0);
      if(format==="preview"){
        const html=await response.text();
        if(urlRef.current)URL.revokeObjectURL(urlRef.current);
        const url=URL.createObjectURL(new Blob([html],{type:"text/html"}));urlRef.current=url;
        setPreview(html);setPreviewUrl(url);
      }else{
        const data=await response.json();
        if(typeof data.downloadUrl!=="string"||!/^\/api\/admin\/products\/catalog\/download\?token=[a-f0-9]{64}$/.test(data.downloadUrl))throw new Error("Tautan PDF belum tersedia.");
        setDownloadUrl(data.downloadUrl);
        const link=document.createElement("a");link.href=data.downloadUrl;link.download="ofissio-katalog.pdf";document.body.append(link);link.click();link.remove();
      }
      setMessage(`${format==="preview"?"Preview siap":"PDF siap diunduh"}${pages?` · ${pages} halaman`:""}.${warningCount?" Sebagian foto tidak dapat dimuat; periksa preview sebelum membagikan katalog.":""}`);
    }catch(err){setError(abort.signal.aborted?"Proses ekspor dibatalkan.":err instanceof Error?err.message:"Katalog belum dapat dibuat.");}
    finally{setBusy(null);controller.current=null;}
  }
  return <div className="space-y-6">
    <AdminCard>
      <fieldset disabled={busy!==null} className="space-y-6 disabled:opacity-70">
        <legend className="text-base font-bold text-ink">Produk yang ditampilkan</legend>
        <div className="grid gap-3 md:grid-cols-3">
          {([ ["all","Seluruh produk",`${products.length} produk terpublikasi`],["category","Kategori tertentu","Pilih satu atau beberapa kategori"],["selected","Produk pilihan","Susun katalog untuk kebutuhan pelanggan"] ] as const).map(([value,label,description])=><label key={value} className={`flex min-h-24 cursor-pointer gap-3 rounded-xl border p-4 ${scope===value?"border-brand-600 bg-brand-50":"border-line bg-white"}`}>
            <input type="radio" name="catalog-scope" value={value} checked={scope===value} onChange={()=>{clearPreview();setScope(value);}} className="mt-1 h-4 w-4 accent-brand-700" />
            <span><span className="block text-sm font-bold text-ink">{label}</span><span className="mt-1 block text-xs leading-5 text-ink-muted">{description}</span></span>
          </label>)}
        </div>
        {scope==="category"?<fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold text-ink">Pilih kategori</legend><div className="flex flex-wrap gap-2">{categories.map(c=><label key={c.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 text-sm"><input type="checkbox" checked={categoryIds.includes(c.id)} onChange={()=>toggle(c.id,categoryIds,setCategoryIds)} className="h-4 w-4 accent-brand-700" />{c.name}</label>)}</div></fieldset>:null}
        {scope==="selected"?<div className="space-y-3">
          <label className="relative block"><span className="sr-only">Cari produk untuk katalog</span><Search className="absolute left-3 top-3 h-4 w-4 text-ink-muted" aria-hidden="true"/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari nama atau SKU produk" className="min-h-11 w-full rounded-lg border border-line py-2 pl-10 pr-3 text-sm"/></label>
          <div className="flex flex-wrap items-center gap-3 text-sm"><button type="button" className="min-h-11 font-semibold text-brand-700" onClick={()=>{clearPreview();setProductIds([...new Set([...productIds,...filtered.map(p=>p.id)])]);}}>Pilih hasil pencarian</button><button type="button" className="min-h-11 text-ink-muted" onClick={()=>{clearPreview();setProductIds([]);}}>Hapus pilihan</button><span className="text-ink-muted">{productIds.length} dipilih</span></div>
          <div className="max-h-80 overflow-auto rounded-lg border border-line">{filtered.length?filtered.map(p=><label key={p.id} className="flex min-h-14 cursor-pointer items-start gap-3 border-b border-line p-3 last:border-0 hover:bg-brand-50"><input type="checkbox" checked={productIds.includes(p.id)} onChange={()=>toggle(p.id,productIds,setProductIds)} className="mt-1 h-4 w-4 accent-brand-700"/><span><span className="block text-sm font-semibold text-ink">{p.name}</span><span className="text-xs text-ink-muted">{p.sku||"SKU belum tersedia"}</span></span></label>):<p className="p-4 text-sm text-ink-muted">Produk tidak ditemukan.</p>}</div>
        </div>:null}
        <fieldset className="space-y-3"><legend className="mb-3 text-sm font-bold text-ink">Isi katalog</legend>
          <label className="flex min-h-11 cursor-pointer items-start gap-3"><input type="checkbox" checked={includeVariants} onChange={e=>{clearPreview();setIncludeVariants(e.target.checked);}} className="mt-1 h-4 w-4 accent-brand-700"/><span className="text-sm"><span className="font-semibold text-ink">Tampilkan seluruh varian</span><span className="mt-1 block text-xs text-ink-muted">Semua pilihan warna dan lengan, beserta foto, SKU, dan ukuran.</span></span></label>
          <label className="flex min-h-11 cursor-pointer items-center gap-3"><input type="checkbox" checked={showPrices} onChange={e=>{clearPreview();setShowPrices(e.target.checked);}} className="h-4 w-4 accent-brand-700"/><span className="text-sm font-semibold text-ink">Tampilkan harga mulai</span></label>
        </fieldset>
      </fieldset>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
        <p className="text-sm text-ink-muted"><strong className="text-ink">{count} produk</strong> · A4 landscape · Corporate Precision</p>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={!!busy||count===0||count>200} onClick={()=>void run("preview")} className={`${button} border border-brand-200 bg-white text-brand-700 hover:bg-brand-50`}>{busy==="preview"?<LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true"/>:<Eye className="h-4 w-4" aria-hidden="true"/>}Lihat Preview</button><button type="button" disabled={!!busy||count===0||count>200} onClick={()=>void run("pdf")} className={`${button} bg-brand-700 text-white hover:bg-brand-800`}>{busy==="pdf"?<LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true"/>:<Download className="h-4 w-4" aria-hidden="true"/>}Unduh PDF</button></div>
      </div>
      {busy?<div role="status" className="mt-4 flex flex-wrap items-center gap-3 text-sm text-ink-muted">Menyiapkan katalog dari data produk terbaru…<button type="button" onClick={()=>controller.current?.abort()} className="min-h-11 font-semibold text-brand-700">Batalkan</button></div>:null}
      {error?<p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>:null}
      {message?<p role="status" className="mt-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-800">{message}</p>:null}
      {downloadUrl?<p className="mt-3 text-sm text-ink-muted">Jika unduhan belum mulai, <a href={downloadUrl} download="ofissio-katalog.pdf" className="font-semibold text-brand-700 underline">unduh PDF di sini</a>. Tautan berlaku 15 menit.</p>:null}
      {!products.length?<p className="mt-4 text-sm text-ink-muted">Belum ada produk terpublikasi yang dapat diekspor.</p>:null}
      {count>200?<p role="alert" className="mt-4 text-sm text-red-800">Pilih maksimal 200 produk per katalog atau gunakan kategori tertentu.</p>:null}
    </AdminCard>
    <AdminCard><div className="flex items-start gap-3"><FileText className="mt-1 h-5 w-5 shrink-0 text-brand-700" aria-hidden="true"/><p className="text-sm leading-6 text-ink-muted">Katalog menyertakan cover showroom, deskripsi lengkap, daftar isi yang bisa diklik, dan bookmark kategori. Halaman lanjutan memakai foto tambahan atau deskripsi lebih lebar.</p></div></AdminCard>
    {preview?<AdminCard><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-bold text-ink">Preview katalog</h2><a href={previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700">Buka preview di tab baru</a></div><iframe title="Preview katalog Ofissio" srcDoc={preview} sandbox="" className="h-[720px] w-full rounded-lg border border-line bg-slate-100"/></AdminCard>:null}
  </div>;
}
