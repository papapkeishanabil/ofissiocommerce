"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Scissors, Trash2 } from "lucide-react";
import { LogoUploadPanel } from "@/components/configurator/LogoUploadPanel";
import { NameEmbroideryEditor } from "@/components/configurator/NameEmbroideryEditor";
import { embroideryTextSummary, validateNameAllocations } from "@/lib/embroidery-names";
import { embroideryRequestIssue, productEmbroideryZones } from "@/features/products/embroidery-request";
import { normalizeEmbroideryZoneId, type EmbroideryPricing } from "@/features/products/embroidery-pricing";
import type { OfissioProduct } from "@/features/products/product.types";
import { EMBROIDERY_ZONES, embroiderySizeLabel, zoneLabel, type EmbroideryPlacement, type EmbroideryZone } from "@/types/uniform-3d";
import { onConfigurationLogin, readConfigurationLogin, type EmbroideryLoginDraft } from "@/features/auth/configuration-continuation";
import styles from "./EmbroideryOptions.module.css";

interface Props {
  product: OfissioProduct;
  pricing: EmbroideryPricing;
  sizes: Record<string, number>;
  value: EmbroideryPlacement[];
  onChange: (placements: EmbroideryPlacement[]) => void;
  onPendingChange: (pending: boolean) => void;
  initialOpen?: boolean;
}

type Draft = EmbroideryLoginDraft;

function draftFor(placement?: EmbroideryPlacement): Draft {
  return {kind: placement?.textBordir ? "text" : "logo", logo: placement && !placement.textBordir ? {fileId: placement.logoFileId, fileName: placement.logoFileName, previewUrl: placement.logoPreviewUrl} : undefined, text: placement?.textBordir, sizing: placement?.sizingMode === "ofissio" || !placement ? "ofissio" : "customer", width: String(placement?.widthCm ?? ""), height: String(placement?.heightCm ?? ""), notes: placement?.notes ?? ""};
}

export function EmbroideryOptions({product, pricing, sizes, value, onChange, onPendingChange, initialOpen = false}: Props) {
  const id = useId();
  const [open, setOpen] = useState(initialOpen || value.length > 0);
  const [zone, setZone] = useState<EmbroideryZone | null>(null);
  const [draft, setDraft] = useState<Draft>(() => draftFor());
  const [dirty, setDirty] = useState(false);
  const [textDirty, setTextDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const panelRef=useRef<HTMLElement>(null);
  const editorRef=useRef<HTMLElement>(null);
  const editorHeadingRef=useRef<HTMLHeadingElement>(null);
  const pending = dirty || textDirty || uploading;
  useEffect(() => { onPendingChange(pending); }, [pending, onPendingChange]);
  const zones = EMBROIDERY_ZONES.filter(item => productEmbroideryZones(product).includes(item));
  const bounds = pricing.zones.find(item => item.zoneId === normalizeEmbroideryZoneId(zone));
  const reusable = [...new Map(value.filter(item => !item.textBordir).map(item => [item.logoFileId, item])).values()];
  useEffect(() => {
    const saved=readConfigurationLogin()?.embroidery;
    if(!saved || saved.productId!==product.id) return;
    setOpen(saved.open);setZone(saved.zone);setDraft(saved.draft);setDirty(saved.dirty);setTextDirty(saved.textDirty);
  }, [product.id]);
  useEffect(() => onConfigurationLogin(state => {
    state.embroidery={productId:product.id,open,zone,draft,dirty,textDirty};
  }), [product.id,open,zone,draft,dirty,textDirty]);

  function reveal(target:"panel"|"editor") {
    requestAnimationFrame(() => {
      if(target==="editor") editorHeadingRef.current?.focus({preventScroll:true});
      const panel=panelRef.current;const editor=editorRef.current;
      if(!panel) return;
      const scroller=panel.closest<HTMLElement>("[data-workspace-scroll]");
      const viewportTop=(scroller?.getBoundingClientRect().top ?? 0)+16;
      const viewportBottom=scroller?.getBoundingClientRect().bottom ?? window.innerHeight;
      const panelTop=panel.getBoundingClientRect().top;
      const editorTop=editor?.getBoundingClientRect().top;
      // Keep the position buttons visible as the editor expands below them.
      if(panelTop<viewportTop || panelTop>viewportBottom-180 || (target==="editor" && editorTop!=null && editorTop>viewportBottom-320)) {
        panel.scrollIntoView({block:"start",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
      }
    });
  }

  function change(next: Partial<Draft>) { setDraft(previous => ({...previous, ...next})); setDirty(true); setError(""); }
  function select(next: EmbroideryZone) {
    setZone(next);setDraft(draftFor(value.find(item => item.zone === next)));setDirty(false);setTextDirty(false);setError("");
    reveal("editor");
  }
  function cancel() { setZone(null);setDirty(false);setTextDirty(false);setError(""); }
  function save() {
    if (!zone || uploading) return;
    if (textDirty) {setError("Terapkan tulisan atau daftar nama terlebih dahulu.");return;}
    if (draft.kind === "logo" && !draft.logo) {setError("Unggah atau pilih logo untuk posisi ini.");return;}
    if (draft.kind === "text" && !draft.text) {setError("Isi dan terapkan tulisan bordir terlebih dahulu.");return;}
    const common = {zone, logoFileId: draft.kind === "text" ? `text-${zone}` : draft.logo!.fileId, logoFileName: draft.kind === "text" ? "Bordir nama" : draft.logo!.fileName, textBordir: draft.kind === "text" ? draft.text : undefined, rotation: 0, technique: "embroidery" as const, notes: draft.notes.trim() || undefined};
    const placement: EmbroideryPlacement = draft.sizing === "ofissio"
      ? {...common, sizingMode: "ofissio", widthCm: null, heightCm: null}
      : {...common, sizingMode: "customer", widthCm: Number(draft.width), heightCm: Number(draft.height)};
    const issue = embroideryRequestIssue([placement], product, pricing) ?? validateNameAllocations([placement], sizes);
    if (issue) {setError(issue);return;}
    onChange([...value.filter(item => item.zone !== zone), placement]);cancel();reveal("panel");
  }

  return <section ref={panelRef} className={styles.panel} aria-label="Pilihan bordir produk">
    <button type="button" className={styles.toggle} aria-expanded={open} aria-controls={`${id}-body`} onClick={() => {setOpen(previous => !previous);if(!open)reveal("panel");}}><Scissors size={18} aria-hidden="true"/><span>Tambahkan bordir <small>{value.length ? `${value.length} posisi tersimpan` : "Opsional"}</small></span></button>
    <div id={`${id}-body`} className={styles.body} hidden={!open}>
      <p>Pilih posisi, lalu unggah logo atau isi tulisan untuk setiap posisi. File dapat berbeda atau digunakan kembali.</p>
      <div className={styles.positions} aria-label="Pilih posisi bordir">
        {zones.map(item => <button key={item} type="button" aria-pressed={zone === item} disabled={pending} onClick={() => select(item)}>{value.some(saved => saved.zone === item) && <Check size={14} aria-hidden="true"/>}{zoneLabel(item)}</button>)}
      </div>
      {zone && <section ref={editorRef} data-configuration-editor className={styles.editor} aria-label={`Pengaturan ${zoneLabel(zone)}`}>
        <h3 ref={editorHeadingRef} tabIndex={-1}>{zoneLabel(zone)}</h3>
        <fieldset className={styles.choices} disabled={uploading}><legend>Isi bordir</legend>
          <label><input type="radio" name={`${id}-kind`} checked={draft.kind === "logo"} onChange={() => {change({kind:"logo"});setTextDirty(false);}}/>Logo</label>
          <label><input type="radio" name={`${id}-kind`} checked={draft.kind === "text"} onChange={() => change({kind:"text"})}/>Tulisan / nama</label>
        </fieldset>
        {draft.kind === "logo" ? <>
          {reusable.length > 0 && <label className={styles.field}>Gunakan logo yang sudah diunggah<select value={draft.logo?.fileId ?? ""} disabled={uploading} onChange={event => {const logo=reusable.find(item => item.logoFileId === event.target.value);change({logo:logo ? {fileId:logo.logoFileId,fileName:logo.logoFileName,previewUrl:logo.logoPreviewUrl} : undefined});}}><option value="">Pilih logo atau unggah file baru</option>{reusable.map(item => <option key={item.logoFileId} value={item.logoFileId}>{item.logoFileName}</option>)}</select></label>}
          {draft.logo && <p className={styles.file}>File dipilih: <strong>{draft.logo.fileName}</strong></p>}
          <LogoUploadPanel key={zone} previewUrl={draft.logo?.previewUrl} fileName={draft.logo?.fileName} onUploaded={logo => change({logo})} onClear={() => change({logo:undefined})} onUploadStateChange={setUploading}/>
        </> : <NameEmbroideryEditor key={zone} value={draft.text} sizes={sizes} onDirty={setTextDirty} onApply={text => {change({text});setTextDirty(false);}}/>}
        <fieldset className={styles.choices}><legend>Ukuran bordir</legend>
          <label><input type="radio" name={`${id}-size`} checked={draft.sizing === "ofissio"} onChange={() => change({sizing:"ofissio"})}/>Rekomendasikan oleh Ofissio</label>
          <label><input type="radio" name={`${id}-size`} checked={draft.sizing === "customer"} onChange={() => change({sizing:"customer"})}/>Atur ukuran sendiri</label>
        </fieldset>
        {draft.sizing === "ofissio" ? <p className={styles.notice}>Tim Ofissio akan menyesuaikan ukuran secara proporsional. Ukuran dan penempatan akan dikonfirmasi sebelum produksi. Tarif mengikuti posisi bordir yang dipilih.</p> : <div className={styles.dimensions}>
          <label className={styles.field}>Lebar (cm)<input type="number" min="3" max={bounds?.maxWidthCm ?? 30} step="0.1" value={draft.width} onChange={event => change({width:event.target.value})}/></label>
          <label className={styles.field}>Tinggi (cm)<input type="number" min="1" max={bounds?.maxHeightCm ?? 30} step="0.1" value={draft.height} onChange={event => change({height:event.target.value})}/></label>
        </div>}
        <label className={styles.field}>Catatan posisi (opsional)<textarea rows={2} maxLength={240} value={draft.notes} placeholder="Contoh: jangan melewati saku." onChange={event => change({notes:event.target.value})}/></label>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <div className={styles.actions}><button type="button" onClick={save} disabled={uploading}>{uploading ? "Menyimpan file…" : `Simpan bordir ${zoneLabel(zone).toLowerCase()}`}</button><button type="button" onClick={cancel} disabled={uploading}>Batal</button></div>
      </section>}
      {pending && <p role="status" className={styles.notice}>Simpan pengaturan posisi ini atau pilih Batal sebelum melanjutkan.</p>}
      {value.length > 0 && <section className={styles.saved} aria-label="Ringkasan bordir tersimpan"><h3>Ringkasan bordir</h3>{value.map(item => <article key={item.zone}><div><strong>✓ {zoneLabel(item.zone)}</strong><p>{embroideryTextSummary(item)}</p><p>{embroiderySizeLabel(item)}</p>{item.notes && <p>Catatan: {item.notes}</p>}</div><div className={styles.rowActions}><button type="button" disabled={pending} onClick={() => select(item.zone)}>Edit</button><button type="button" disabled={pending} aria-label={`Hapus bordir ${zoneLabel(item.zone)}`} onClick={() => {onChange(value.filter(row => row.zone !== item.zone));if(zone === item.zone)cancel();}}><Trash2 size={16} aria-hidden="true"/></button></div></article>)}</section>}
    </div>
  </section>;
}
