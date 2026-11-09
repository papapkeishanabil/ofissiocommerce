"use client";

/* eslint-disable @next/next/no-img-element -- Signed artwork must load directly without an image proxy. */
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle, ExternalLink, ImageIcon, Send, X } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AdminEmbroideryEstimateForm } from "./AdminEmbroideryEstimateForm";
import { AdminProductThumb } from "./AdminProductThumb";
import type { AdminLogoPreview } from "../admin.types";
import type { AdminProductImage } from "../admin-product-images";
import type { QuotationRequestRecord } from "@/features/quotation/quotation.types";
import type { BiteshipCourierService } from "@/features/shipping-settings/shipping-settings.types";
import { embroideryEstimatePayloadSchema, type EmbroideryEstimatePayload } from "@/features/quotation/embroidery-estimate.validation";
import { calculateQuotationPricing, isQuotationPricingEditable } from "@/features/quotation/quotation.utils";
import { quotationEmbroideryLines } from "@/features/quotation/quotation-embroidery-lines";
import { normalizeEmbroideryZoneId } from "@/features/products/embroidery-pricing";
import { embroiderySizeLabel } from "@/types/uniform-3d";
import { embroideryTextSummary } from "@/lib/embroidery-names";
import { sortProductSizes } from "@/lib/product-size-order";
import { formatIDR } from "@/types/product";
import styles from "./AdminEmbroideryWorkbench.module.css";

type Props = {quotation:QuotationRequestRecord;productImages:Record<string,AdminProductImage>;logoPreviews:AdminLogoPreview[];courierOptions:BiteshipCourierService[]};
const PricingDisabled=createContext(false);

export function AdminEmbroideryWorkbench({quotation,productImages,logoPreviews,courierOptions}:Props) {
  const router=useRouter();
  const editable=isQuotationPricingEditable(quotation.status);
  const [rows,setRows]=useState(()=>quotation.items.map(item=>({itemId:item.id,unitPrice:item.unitPrice??item.priceFrom,discountAmount:item.discountAmount??0,finalUnitPrice:String(item.finalUnitPrice??item.unitPrice??item.priceFrom),embroideryLines:quotationEmbroideryLines(item).map(line=>({...line,unitPrice:item.missingEmbroideryPricingZones.includes(line.zoneId)?"":String(line.unitPrice),setupFee:String(line.setupFee)}))})));
  const [discount,setDiscount]=useState(String(quotation.discountTotal));
  const [shipping,setShipping]=useState(String(quotation.shippingEstimate));
  const [taxEnabled,setTaxEnabled]=useState(quotation.taxEnabled);
  const [taxRate,setTaxRate]=useState(String(quotation.taxRate));
  const [validUntil,setValidUntil]=useState(quotation.validUntil?.slice(0,10)??new Date(Date.now()+7*86400000).toISOString().slice(0,10));
  const [message,setMessage]=useState(quotation.customerMessage??"");
  const [internalNote,setInternalNote]=useState(quotation.salesNotes??"");
  const [estimate,setEstimate]=useState<EmbroideryEstimatePayload>();
  const [busy,setBusy]=useState(false);
  const [feedback,setFeedback]=useState<{error:boolean;text:string}|null>(null);
  const [preview,setPreview]=useState<{url:string;label:string}|null>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  const feedbackRef=useRef<HTMLParagraphElement>(null);
  const saving=useRef(false);
  const whatsapp=quotation.picWhatsapp?.replace(/\D/g,"").replace(/^0/,"62");
  async function copyCustomerLink(){
    try{await navigator.clipboard.writeText(`${window.location.origin}/quotes/${quotation.id}`);setFeedback({error:false,text:"Tautan customer disalin. Anda bisa membagikannya melalui WhatsApp."});}
    catch{setFeedback({error:true,text:"Tautan belum dapat disalin. Buka halaman customer dan salin alamatnya."});}
  }
  async function resend(){
    if(saving.current)return;
    saving.current=true;setBusy(true);setFeedback(null);
    try{
      const response=await fetch(`/api/admin/quotations/${quotation.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"send_quote_to_customer"})});
      const result=await response.json() as {ok?:boolean;message?:string};
      if(!response.ok||!result.ok)throw new Error(result.message??"Rincian belum dapat dikirim ulang.");
      setFeedback({error:false,text:"Rincian penawaran sudah dikirim ulang ke customer."});
    }catch(error){setFeedback({error:true,text:error instanceof Error?error.message:"Koneksi terputus. Coba kembali."});}
    finally{saving.current=false;setBusy(false);}
  }
  useEffect(()=>{if(preview)dialog.current?.showModal();else dialog.current?.close();},[preview]);
  useEffect(()=>{if(feedback?.error)feedbackRef.current?.focus();},[feedback]);

  const pricing={action:"update_pricing" as const,items:rows.map(row=>({...row,finalUnitPrice:Number(row.finalUnitPrice),embroideryLines:row.embroideryLines.filter(line=>line.unitPrice!=="").map(line=>({zoneId:line.zoneId,unitPrice:Number(line.unitPrice),setupFee:Number(line.setupFee)}))})),discountTotal:Number(discount),shippingEstimate:Number(shipping),taxEnabled,taxRate:Number(taxRate),validUntil,customerMessage:message,salesNotes:internalNote,salesEmail:quotation.salesEmail??"sales@ofissio.com"};
  const calculated=calculateQuotationPricing(quotation,pricing);
  const missingPrices=rows.some(row=>row.finalUnitPrice===""||row.embroideryLines.some(line=>line.unitPrice===""));
  const completeEstimate=embroideryEstimatePayloadSchema.safeParse(estimate?{...estimate,validUntil}:undefined);
  function updatePrice(index:number,value:string){setRows(old=>old.map((row,i)=>i===index?{...row,finalUnitPrice:value}:row));}
  function updateZone(index:number,zone:string,key:"unitPrice"|"setupFee",value:string){setRows(old=>old.map((row,i)=>i===index?{...row,embroideryLines:row.embroideryLines.map(line=>line.zoneId===zone?{...line,[key]:value}:line)}:row));}
  async function save(publish:boolean) {
    if(saving.current)return;
    if(publish&&missingPrices){setFeedback({error:true,text:"Lengkapi harga produk dan harga setiap posisi bordir."});return;}
    if(publish&&!completeEstimate.success){setFeedback({error:true,text:"Lengkapi estimasi pengerjaan: penanggung jawab, tanggal, dan layanan pengiriman. Periksa juga urutan tanggalnya."});document.getElementById("embroidery-workbench-estimate")?.scrollIntoView({block:"start",behavior:"smooth"});return;}
    saving.current=true;setBusy(true);setFeedback(null);
    try {
      const response=await fetch(`/api/admin/quotations/${quotation.id}/workbench`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({pricing,estimate:completeEstimate.success?completeEstimate.data:undefined,publish})});
      const result=await response.json() as {ok?:boolean;message?:string};
      if(!response.ok||!result.ok)throw new Error(result.message??"Rincian belum berhasil disimpan.");
      setFeedback({error:false,text:publish?"Rincian harga dan estimasi pengerjaan sudah dikirim bersama ke customer.":completeEstimate.success?"Draft harga dan estimasi tersimpan. Belum dikirim ke customer.":"Draft harga tersimpan. Estimasi belum lengkap dan belum dikirim ke customer."});
      if(publish)router.refresh();
    }catch(error){setFeedback({error:true,text:error instanceof Error?error.message:"Koneksi terputus. Isian Anda tetap tersedia; coba simpan kembali."});}
    finally{saving.current=false;setBusy(false);}
  }
  return <PricingDisabled.Provider value={!editable||busy}><section className={styles.workbench} aria-label="Siapkan pesanan bordir">
    <header className={styles.heading}><div><p className={styles.eyebrow}>Pesanan bordir</p><h2>{editable?"Periksa produk, tentukan harga, lalu kirim":"Rincian yang dikirim ke customer"}</h2><p>Foto, logo, dan harga berada dalam area yang sama. Klik gambar untuk memperbesar.</p></div><span className={styles.count}>{quotation.totalQty} pcs · {quotation.items.length} produk</span></header>
    <div className={styles.contact}><p><strong>{quotation.picName}</strong> · {quotation.companyName}</p><div>{whatsapp&&<a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp customer <ExternalLink size={14}/></a>}<button type="button" onClick={()=>void copyCustomerLink()}>Salin tautan customer</button></div></div>
    <div className={styles.layout}>
      <div className={styles.content}>
        <div className={styles.fieldset}>
          {quotation.items.map((item,index)=>{
            const row=rows[index]!;
            const image=item.image??productImages[item.productId]?.mainImage;
            return <article key={item.id} className={styles.item} aria-label={`Harga ${item.productName}`}>
              <div className={styles.product}>
                <button type="button" className={styles.photoButton} disabled={!image} onClick={()=>image&&setPreview({url:image,label:item.productName})} aria-label={`Perbesar foto ${item.productName}`}><AdminProductThumb src={image} alt={item.productName} size="lg" className={styles.productPhoto}/></button>
                <div className={styles.productInfo}><h3>{item.productName}</h3><p>{item.selectedColor} · {item.totalQty} pcs</p><p className={styles.muted}>SKU: {item.sku}</p><dl className={styles.sizes}>{sortProductSizes(Object.keys(item.sizeMatrix).filter(size=>(item.sizeMatrix[size as keyof typeof item.sizeMatrix]??0)>0)).map(size=><div key={size}><dt>{size}</dt><dd>{item.sizeMatrix[size as keyof typeof item.sizeMatrix]} pcs</dd></div>)}</dl></div>
              </div>
              {item.customization&&<p className={styles.customerNote}><strong>Catatan customer:</strong> {item.customization}</p>}
              <div className={styles.productPrice}><Money label="Harga kemeja / pcs" value={row.finalUnitPrice} onChange={value=>updatePrice(index,value)}/><div><span className={styles.muted}>Subtotal produk</span><strong>{formatIDR(Number(row.finalUnitPrice)*item.totalQty)}</strong><small>Harga awal {formatIDR(row.unitPrice)} / pcs</small></div></div>
              <div className={styles.zones}>
                {row.embroideryLines.map(line=>{
                  const placement=item.embroideryPlacements.find(p=>normalizeEmbroideryZoneId(p.zone)===line.zoneId);
                  const logo=logoPreviews.find(p=>p.fileId===placement?.logoFileId);
                  return <section key={line.zoneId} className={styles.zone} aria-label={`Bordir ${line.label}`}>
                    <div className={styles.zoneReference}>
                      {placement?.textBordir?<span className={styles.textBadge}>Aa</span>:<button className={styles.logoButton} type="button" aria-label={`Perbesar logo ${line.label}`} disabled={!logo?.signedUrl} onClick={()=>logo?.signedUrl&&setPreview({url:logo.signedUrl,label:`${line.label} — ${placement?.logoFileName??"Logo"}`})}>{logo?.signedUrl?<img src={logo.signedUrl} alt={`Logo ${line.label}`} loading="lazy"/>:<ImageIcon aria-hidden="true"/>}</button>}
                      <div className={styles.referenceText}><h4>{line.label}</h4><p>{placement?embroideryTextSummary(placement):"Posisi bordir"}</p>{placement&&<p className={styles.muted}>{embroiderySizeLabel(placement)}</p>}{placement?.notes&&<p className={styles.positionNote}>{placement.notes}</p>}{!placement?.textBordir&&!logo?.signedUrl&&<p className={styles.warning}>Pratinjau tidak tersedia. Periksa file asli sebelum melanjutkan.</p>}</div>
                    </div>
                    <div className={styles.zonePrices}><Money label={`${line.label} / pcs`} value={line.unitPrice} onChange={value=>updateZone(index,line.zoneId,"unitPrice",value)}/><Money label={`Biaya persiapan ${line.label}`} value={line.setupFee} onChange={value=>updateZone(index,line.zoneId,"setupFee",value)}/><p>{item.totalQty} pcs × {formatIDR(Number(line.unitPrice))} + persiapan {formatIDR(Number(line.setupFee))} = <strong>{formatIDR(Number(line.unitPrice)*item.totalQty+Number(line.setupFee))}</strong></p></div>
                  </section>;
                })}
              </div>
              <details className={styles.extra}><summary>Diskon produk & informasi tambahan</summary><Money label="Diskon produk (total)" value={String(row.discountAmount)} onChange={value=>setRows(old=>old.map((r,i)=>i===index?{...r,discountAmount:Number(value)}:r))}/>{Object.entries(item.selectedOptions??{}).map(([key,value])=><p key={key}>{key}: {value}</p>)}</details>
            </article>;
          })}
        </div>
        {quotation.customerNotes&&<section className={styles.panel}><h3>Catatan pesanan dari customer</h3><p className={styles.preserve}>{quotation.customerNotes}</p></section>}
        {editable&&<section className={styles.panel} id="embroidery-workbench-estimate"><AdminEmbroideryEstimateForm quotationId={quotation.id} initialEstimate={quotation.embroideryEstimate} courierOptions={courierOptions} embedded onEstimateChange={setEstimate}/><p className={styles.muted}>Estimasi ikut dikirim bersama harga melalui tombol “Kirim rincian ke customer”. Sesuaikan jadwal jika pembayaran atau persetujuan desain berubah.</p></section>}
        <fieldset disabled={!editable||busy} className={styles.panel}><legend className="sr-only">Catatan dan masa berlaku</legend><h3>Pesan untuk customer</h3><label className={styles.label}>Keterangan tambahan <span>(opsional)</span><textarea value={message} maxLength={1000} onChange={e=>setMessage(e.target.value)} rows={3} placeholder="Contoh: ukuran logo akan kami sesuaikan agar proporsional."/></label><details className={styles.extra}><summary>Catatan internal</summary><label className={styles.label}>Hanya untuk tim Ofissio<textarea value={internalNote} maxLength={1000} onChange={e=>setInternalNote(e.target.value)} rows={3}/></label></details></fieldset>
      </div>
      <aside className={styles.summary} aria-label="Total dan tindakan pesanan">
        <div className={styles.summaryTitle}><h3>Ringkasan harga</h3><p>Perubahan harga langsung dihitung.</p></div>
        <dl className={styles.totals}><div><dt>Produk & bordir</dt><dd>{formatIDR(calculated.subtotal)}</dd></div>{calculated.discountTotal>0&&<div><dt>Diskon pesanan</dt><dd>− {formatIDR(calculated.discountTotal)}</dd></div>}<div><dt>{quotation.taxLabel||"PPN"} {taxEnabled?`${taxRate}%`:"tidak dikenakan"}</dt><dd>{formatIDR(calculated.taxTotal)}</dd></div><div><dt>Pengiriman</dt><dd>{formatIDR(calculated.shippingEstimate)}</dd></div><div className={styles.grandTotal}><dt>Total pesanan</dt><dd>{formatIDR(calculated.grandTotal)}</dd></div></dl>
        <fieldset disabled={!editable||busy} className={styles.adjustments}><legend className="sr-only">Penyesuaian harga</legend><Money label="Ongkos kirim" value={shipping} onChange={setShipping}/><label className={styles.label}>Penawaran berlaku sampai<input type="date" value={validUntil} onChange={e=>setValidUntil(e.target.value)}/></label><details className={styles.extra}><summary>Diskon & pajak</summary><Money label="Diskon pesanan (total)" value={discount} onChange={setDiscount}/><label className={styles.check}><input type="checkbox" checked={taxEnabled} onChange={e=>setTaxEnabled(e.target.checked)}/>Kenakan {quotation.taxLabel||"PPN"}</label>{taxEnabled&&<Money label="Tarif pajak (%)" value={taxRate} onChange={setTaxRate} max={100}/>}</details></fieldset>
        {editable?<div className={styles.actions}><ul className={styles.checklist}><li>{missingPrices?<Circle aria-hidden="true"/>:<Check aria-hidden="true"/>}{missingPrices?"Lengkapi harga per posisi":"Harga setiap posisi terisi"}</li><li>{completeEstimate.success?<Check aria-hidden="true"/>:<Circle aria-hidden="true"/>}{completeEstimate.success?"Estimasi pengerjaan siap":"Lengkapi estimasi pengerjaan"}</li></ul><Button type="button" disabled={busy} aria-busy={busy} onClick={()=>void save(true)}><Send size={16} aria-hidden="true"/>{busy?"Menyimpan…":"Kirim rincian ke customer"}</Button><Button type="button" variant="outline" disabled={busy} onClick={()=>void save(false)}>Simpan draft harga</Button><p className={styles.muted}>Harga dan estimasi dikirim dalam satu penawaran untuk disetujui customer.</p></div>:<p className={styles.locked}>Rincian sudah dikirim. Perubahan harga dibuka kembali saat customer meminta perubahan.</p>}
        {feedback&&<p ref={feedbackRef} tabIndex={-1} role={feedback.error?"alert":"status"} className={feedback.error?styles.error:styles.success}>{feedback.text}</p>}
        {quotation.convertedOrderId&&<ButtonLink href={`/admin/orders/${quotation.convertedOrderId}`} variant="outline">Buka pesanan <ExternalLink size={16}/></ButtonLink>}
        {quotation.status==="quoted"&&<Button type="button" variant="outline" disabled={busy} onClick={()=>void resend()}>Kirim ulang ke customer</Button>}
      </aside>
    </div>
    <dialog ref={dialog} className={styles.preview} onCancel={()=>setPreview(null)} onClick={event=>{if(event.target===event.currentTarget)setPreview(null);}} aria-label={preview?.label??"Pratinjau gambar"}><header><h3>{preview?.label}</h3><button type="button" onClick={()=>setPreview(null)} aria-label="Tutup pratinjau"><X/></button></header>{preview&&<><img src={preview.url} alt={preview.label}/><a href={preview.url} target="_blank" rel="noopener noreferrer">Buka file asli <ExternalLink size={16}/></a></>}</dialog>
  </section></PricingDisabled.Provider>;
}

function Money({label,value,onChange,max=10000000000}:{label:string;value:string;onChange:(value:string)=>void;max?:number}) {
  const disabled=useContext(PricingDisabled);
  return <label className={styles.label}>{label}<span className={styles.moneyInput}>{max!==100&&<span aria-hidden="true">Rp</span>}<input disabled={disabled} aria-label={label} type="number" inputMode="decimal" min={0} max={max} step={max===100?0.01:1} value={value} onChange={event=>onChange(event.target.value)}/></span></label>;
}
