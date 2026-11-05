"use client";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, GripVertical, History, ImagePlus, Loader2, Monitor, Plus, Save, Smartphone, Trash2, X } from "lucide-react";
import { storefrontFont } from "@/components/shell/storefront-font";
import { PageRenderer } from "./PageRenderer";
import { createSection } from "./page.defaults";
import { invalidateReview, pageDocumentSchema, publishIssues, requiresVerification, sectionNames, sectionTypes, type PageCommand, type PageDocument, type PageImage, type PageSection, type PageState, type SectionType } from "./page.schema";
import s from "./PageBuilder.module.css";
const layoutTemplates:Record<SectionType,PageSection["layout"][]>={hero:["editorial","split"],story:["editorial","split"],store:["split","editorial"],collection:["editorial","grid"],operations:["mosaic","grid","split"],closing:["editorial","split"]};
const layoutLabels={editorial:"Editorial",split:"Split",mosaic:"Mosaik",grid:"Grid foto"};
function Field({ label, children }: {
    label: string;
    children: ReactNode;
}) { return <label className={s.field}><span>{label}</span>{children}</label>; }
function LiveCanvas({ document, device, onSelect, onLink }: {
    document: PageDocument;
    device: "desktop" | "mobile";
    onSelect: (id: string) => void;
    onLink: () => void;
}) {
    const host = useRef<HTMLDivElement>(null), content = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0), [height, setHeight] = useState(800);
    useEffect(() => { const node = host.current, canvas = content.current; if (!node || !canvas)
        return; const observer = new ResizeObserver(entries => { for (const entry of entries) {
        if (entry.target === node)
            setWidth(entry.contentRect.width);
        if (entry.target === canvas)
            setHeight(entry.contentRect.height);
    } }); observer.observe(node); observer.observe(canvas); return () => observer.disconnect(); }, []);
    const target = device === "desktop" ? 1440 : 390, scale = width ? Math.min(1, width / target) : 1;
    return <div ref={host} className={s.previewViewport}><div style={{ width: target * scale, height: height * scale, margin: "auto" }}><div ref={content} className={`${storefrontFont.variable} ${s.canvas}`} style={{ width: target, transform: `scale(${scale})`, transformOrigin: "top left" }} onClick={event => { const element = event.target as HTMLElement; if (element.closest("a")) {
        event.preventDefault();
        onLink();
        return;
    } const section = element.closest<HTMLElement>("[data-page-section]"); if (section?.dataset.pageSection)
        onSelect(section.dataset.pageSection); }}><PageRenderer document={document} previewDevice={device}/></div></div></div>;
}
export function PageBuilder({ initial, canUpdate }: {
    initial: PageState;
    canUpdate: boolean;
}) {
    const [state, setState] = useState(initial), [document, setDocument] = useState(initial.draft);
    const [selected, setSelected] = useState(initial.draft.sections[0]!.id), [tab, setTab] = useState("content");
    const [device, setDevice] = useState<"desktop" | "mobile">("desktop"), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
    const [history, setHistory] = useState(false), [preview, setPreview] = useState(false), [confirmPublish, setConfirmPublish] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null), [addType, setAddType] = useState<SectionType>("collection");
    const dragged = useRef<string | null>(null), liveDocument = useRef(document);
    useEffect(() => { liveDocument.current = document; }, [document]);
    const dirty = JSON.stringify(document) !== JSON.stringify(state.draft);
    const section = document.sections.find(item => item.id === selected) ?? document.sections[0]!;
    const issues = publishIssues(document);
    useEffect(() => { if (!dirty)
        return; const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; }; window.addEventListener("beforeunload", handler); return () => window.removeEventListener("beforeunload", handler); }, [dirty]);
    useEffect(() => {
        if (!preview && !history && !confirmPublish)
            return;
        const previous = window.document.activeElement as HTMLElement | null;
        const dialog = window.document.querySelector<HTMLElement>('[role="dialog"]');
        const previousOverflow = window.document.body.style.overflow;
        window.document.body.style.overflow = "hidden";
        const handler = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setPreview(false);
                setHistory(false);
                setConfirmPublish(false);
            }
            if (event.key === "Tab" && dialog) {
                const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(el => el.getClientRects().length > 0);
                const first = controls[0], last = controls[controls.length - 1];
                if (event.shiftKey && window.document.activeElement === first) {
                    event.preventDefault();
                    last?.focus();
                }
                else if (!event.shiftKey && window.document.activeElement === last) {
                    event.preventDefault();
                    first?.focus();
                }
            }
        };
        window.addEventListener("keydown", handler);
        return () => { window.removeEventListener("keydown", handler); window.document.body.style.overflow = previousOverflow; previous?.focus(); };
    }, [preview, history, confirmPublish]);
    function change(patch: Partial<PageSection>) { if (!canUpdate || busy)
        return; setDocument(current => ({ ...current, sections: current.sections.map(item => item.id === section.id ? invalidateReview(item, { ...item, ...patch }) : item) })); }
    function imageChange(id: string, patch: Partial<PageImage>) { change({ images: section.images.map(image => image.id === id ? { ...image, ...patch } : image) }); }
    function move(id: string, delta: number) { setDocument(current => { const sections = [...current.sections], index = sections.findIndex(item => item.id === id), target = index + delta; if (index < 0 || target < 0 || target >= sections.length)
        return current; [sections[index], sections[target]] = [sections[target]!, sections[index]!]; return { ...current, sections }; }); }
    async function commit(command: PageCommand) {
        if (!canUpdate || busy)
            return;
        setBusy(true);
        setMessage("");
        try {
            if (command.action === "save")
                pageDocumentSchema.parse(command.document);
            const response = await fetch(`/api/admin/pages/${state.slug}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) });
            const result = await response.json();
            if (!response.ok)
                throw new Error(result.message || "Penyimpanan gagal.");
            setState(result.state);
            // Do not discard edits made while a request was in flight.
            if (command.action !== "save" || JSON.stringify(liveDocument.current) === JSON.stringify(command.document))
                setDocument(result.state.draft);
            setMessage(command.action === "save" ? "Draft tersimpan. Halaman publik belum berubah." : command.action === "restore" ? "Versi dipulihkan ke draft. Periksa kembali sebelum Publish." : "Versi tersimpan telah dipublikasikan.");
            setConfirmPublish(false);
            setHistory(false);
        }
        catch (error) {
            setMessage(error instanceof Error ? error.message : "Permintaan gagal.");
        }
        finally {
            setBusy(false);
        }
    }
    async function upload(id: string, file: File, mobile: boolean) {
        setUploading(id);
        setMessage("");
        try {
            const form = new FormData();
            form.set("file", file);
            const response = await fetch("/api/admin/site-content/upload", { method: "POST", body: form });
            const result = await response.json();
            if (!response.ok)
                throw new Error(result.message || "Upload gagal.");
            imageChange(id, mobile ? { mobileSrc: result.url } : { src: result.url, referenceCrop: undefined });
            setMessage("Gambar diunggah. Simpan draft untuk menyimpan pemilihannya.");
        }
        catch (error) {
            setMessage(error instanceof Error ? error.message : "Upload gagal.");
        }
        finally {
            setUploading(null);
        }
    }
    function removeSection() { if (document.sections.length === 1)
        return; if (!window.confirm(`Hapus section ?${section.label}? dari draft?`))
        return; const sections = document.sections.filter(item => item.id !== section.id); setDocument({ ...document, sections }); setSelected(sections[0]!.id); }
    const canvas = <LiveCanvas document={document} device={device} onSelect={setSelected} onLink={() => setMessage("Tautan dinonaktifkan di preview agar draft tetap terbuka.")}/>;
    return <div className={s.builder}>
  <div className={s.toolbar}>
   <div><strong>Page Builder · About Us</strong><p>{dirty ? "Perubahan belum disimpan" : `Draft versi ${state.revision}`} · {state.publishedAt ? "Sudah memiliki versi publik" : "Belum dipublikasikan"}</p></div>
   <div className={s.tools}>
    <button onClick={() => setHistory(true)}><History size={16}/>Riwayat</button>
    <button onClick={() => setPreview(true)}><Eye size={16}/>Preview</button>
    <button disabled={!canUpdate || busy || (!dirty && state.revision > 0) || !!uploading} onClick={() => commit({ action: "save", expectedRevision: state.revision, document })}>{busy ? <Loader2 size={16}/> : <Save size={16}/>}Simpan Draft</button>
    <button className={s.publish} disabled={!canUpdate || busy || dirty || state.revision === 0 || !!uploading} onClick={() => setConfirmPublish(true)}>Publish</button>
   </div>
  </div>
  {state.source === "mock" && <p className={s.notice}>Mode development: draft dan riwayat tersimpan di memori proses, hilang saat server dimulai ulang. Supabase belum digunakan.</p>}
  {message && <div role="status" className={s.notice}>{message}{message.includes("sesi lain") && <button onClick={() => window.location.reload()}>Muat ulang</button>}</div>}
  <div className={s.workspace}>
   <aside className={s.sections} aria-label="Daftar section">
    <h2>Section halaman</h2><p>Seret untuk mengatur urutan, atau gunakan tombol panah.</p>
    {document.sections.map((item, i) => <div key={item.id} className={`${s.sectionItem} ${selected === item.id ? s.selected : ""}`} draggable={canUpdate && !busy} onDragStart={() => { dragged.current = item.id; }} onDragEnd={() => { dragged.current = null; }} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const id = dragged.current; if (!id || !canUpdate || busy)
            return; const from = document.sections.findIndex(x => x.id === id); move(id, i - from); dragged.current = null; }}>
     <button className={s.selectSection} onClick={() => setSelected(item.id)} aria-pressed={selected === item.id}><GripVertical size={15} aria-hidden/><span>{item.label}<small>{sectionNames[item.type]}{!item.visible ? " · Disembunyikan" : ""}</small></span></button>
     <div className={s.rowActions}><button disabled={!canUpdate || busy || i === 0} title="Pindah ke atas" aria-label={`Pindahkan ${item.label} ke atas`} onClick={() => move(item.id, -1)}><ArrowUp size={14}/></button><button disabled={!canUpdate || busy || i === document.sections.length - 1} title="Pindah ke bawah" aria-label={`Pindahkan ${item.label} ke bawah`} onClick={() => move(item.id, 1)}><ArrowDown size={14}/></button><button disabled={!canUpdate || busy} title="Ubah visibilitas" aria-label={`Ubah visibilitas ${item.label}`} onClick={() => setDocument({ ...document, sections: document.sections.map(x => x.id === item.id ? { ...x, visible: !x.visible } : x) })}>{item.visible ? <Eye size={14}/> : <EyeOff size={14}/>}</button></div>
    </div>)}
    <Field label="Template section baru"><select value={addType} onChange={e => setAddType(e.target.value as SectionType)}>{sectionTypes.map(type => <option key={type} value={type}>{sectionNames[type]}</option>)}</select></Field>
    <button disabled={!canUpdate || busy || document.sections.length >= 30} onClick={() => { const item = createSection(addType); setDocument({ ...document, sections: [...document.sections, item] }); setSelected(item.id); }}><Plus size={16}/>Tambah section</button>
   </aside>
   <main className={s.previewArea}>
    <div className={s.previewBar}><span>Live preview draft</span><div><button aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}><Monitor size={15}/>Desktop</button><button aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}><Smartphone size={15}/>Mobile</button></div></div>
    <div className={s.canvasScroll}>{canvas}</div>
   </main>
   <aside className={s.inspector} aria-label="Pengaturan section">
    <h2>{section.label}</h2><div className={s.tabs} role="tablist" aria-label="Pengaturan"><button role="tab" aria-selected={tab === "content"} onClick={() => setTab("content")}>Konten</button><button role="tab" aria-selected={tab === "design"} onClick={() => setTab("design")}>Desain</button><button role="tab" aria-selected={tab === "review"} onClick={() => setTab("review")}>Verifikasi</button></div>
    <fieldset disabled={!canUpdate || busy || !!uploading} className={s.controls}>
    {tab === "content" && <>
     <details><summary>Metadata halaman</summary><Field label="Judul halaman"><input value={document.title} onChange={e => setDocument({ ...document, title: e.target.value })}/></Field><Field label="Deskripsi pencarian"><textarea value={document.description} onChange={e => setDocument({ ...document, description: e.target.value })}/></Field></details>
     <Field label="Label section"><input value={section.label} onChange={e => change({ label: e.target.value })}/></Field>
     <Field label="Judul"><input value={section.title} onChange={e => change({ title: e.target.value })}/></Field><Field label="Teks aksen kuning"><input value={section.accent} onChange={e => change({ accent: e.target.value })}/></Field>
     {section.paragraphs.map((paragraph, i) => <div key={i}><Field label={`Paragraf ${i + 1}`}><textarea rows={5} value={paragraph} onChange={e => change({ paragraphs: section.paragraphs.map((p, n) => n === i ? e.target.value : p) })}/></Field><button onClick={() => change({ paragraphs: section.paragraphs.filter((_, n) => n !== i) })}>Hapus paragraf</button></div>)}
     <button disabled={section.paragraphs.length >= 12} onClick={() => change({ paragraphs: [...section.paragraphs, ""] })}>Tambah paragraf</button>
     {section.type === "story" && <><Field label="Judul panel bidang usaha"><input value={section.panelTitle} onChange={e => change({ panelTitle: e.target.value })}/></Field><Field label="Keterangan bidang usaha"><textarea value={section.panelDescription} onChange={e => change({ panelDescription: e.target.value })}/></Field><Field label="Bidang usaha (satu per baris)"><textarea value={section.items.join("\n")} onChange={e => change({ items: e.target.value.split("\n") })}/></Field></>}
     <h3>Tombol dan tautan</h3>{section.buttons.map((button, i) => <div key={i} className={s.group}><Field label="Teks tombol"><input value={button.label} onChange={e => change({ buttons: section.buttons.map((b, n) => n === i ? { ...b, label: e.target.value } : b) })}/></Field><Field label="Tautan"><input value={button.href} onChange={e => change({ buttons: section.buttons.map((b, n) => n === i ? { ...b, href: e.target.value } : b) })}/></Field><button onClick={() => change({ buttons: section.buttons.filter((_, n) => n !== i) })}>Hapus tombol</button></div>)}<button disabled={section.buttons.length >= 3} onClick={() => change({ buttons: [...section.buttons, { label: "Lihat selengkapnya", href: "/catalog" }] })}>Tambah tombol</button>
     <h3>Foto dan galeri</h3>{section.images.map((image, i) => <details key={image.id} className={s.group}><summary>Foto {i + 1} · {image.caption || image.alt || "Tanpa judul"}</summary>{image.src && <Image unoptimized width={320} height={130} className={s.thumbnail} src={image.src} alt={image.alt}/>}
      <Field label="URL foto desktop"><input value={image.src} onChange={e => imageChange(image.id, { src: e.target.value, referenceCrop: undefined })}/></Field>
      <Field label="URL foto mobile (opsional)"><input value={image.mobileSrc} onChange={e => imageChange(image.id, { mobileSrc: e.target.value })}/></Field>
      <Field label="Upload desktop"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const file = e.target.files?.[0]; if (file)
                void upload(image.id, file, false); }}/></Field>
      <Field label="Upload mobile"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const file = e.target.files?.[0]; if (file)
                void upload(image.id, file, true); }}/></Field>
      <Field label="Alt text"><input value={image.alt} onChange={e => imageChange(image.id, { alt: e.target.value })}/></Field><Field label="Caption opsional"><input value={image.caption} onChange={e => imageChange(image.id, { caption: e.target.value })}/></Field>
      <Field label="Status aset"><select value={image.status} onChange={e => imageChange(image.id, { status: e.target.value as PageImage["status"] })}><option value="illustration">Ilustrasi</option><option value="real-photo">Foto asli terverifikasi</option></select></Field>
      <Field label="Sumber / catatan aset"><textarea value={image.source} onChange={e => imageChange(image.id, { source: e.target.value })}/></Field>
      {(["desktop", "mobile"] as const).map(view => <div key={view}><h4>{view === "desktop" ? "Desktop" : "Mobile"}: crop dan focal point</h4><Field label="Aspect ratio (lebar / tinggi)"><input type="number" step=".05" min=".4" max="4" value={image[view].ratio} onChange={e => imageChange(image.id, { [view]: { ...image[view], ratio: Number(e.target.value) } })}/></Field><Field label="Mode gambar"><select value={image[view].fit} onChange={e => imageChange(image.id, { [view]: { ...image[view], fit: e.target.value } })}><option value="cover">Cover (crop)</option><option value="contain">Contain (utuh)</option></select></Field>{(["x", "y"] as const).map(axis => <Field key={axis} label={`Focal ${axis.toUpperCase()} ? ${image[view][axis]}%`}><input type="range" min="0" max="100" value={image[view][axis]} onChange={e => imageChange(image.id, { [view]: { ...image[view], [axis]: Number(e.target.value) } })}/></Field>)}</div>)}
      <div className={s.tools}><button disabled={i === 0} onClick={() => { const images = [...section.images]; [images[i - 1], images[i]] = [images[i]!, images[i - 1]!]; change({ images }); }}>Ke atas</button><button disabled={i === section.images.length - 1} onClick={() => { const images = [...section.images]; [images[i + 1], images[i]] = [images[i]!, images[i + 1]!]; change({ images }); }}>Ke bawah</button><button onClick={() => change({ images: section.images.filter(x => x.id !== image.id) })}>Hapus foto</button></div>
     </details>)}
     <button disabled={section.images.length >= 12} onClick={() => change({ images: [...section.images, { id: crypto.randomUUID(), src: "", mobileSrc: "", alt: "", caption: "", status: "illustration", source: "", desktop: { ratio: 1.5, x: 50, y: 50, fit: "cover" }, mobile: { ratio: 1.5, x: 50, y: 50, fit: "cover" } }] })}><ImagePlus size={16}/>Tambah foto</button>
    </>}
    {tab === "design" && <>
     <Field label="Template layout"><select value={section.layout} onChange={e => change({ layout: e.target.value as PageSection["layout"] })}>{layoutTemplates[section.type].map(layout=><option key={layout} value={layout}>{layoutLabels[layout]}</option>)}</select></Field>
     {([['background', 'Background'], ['foreground', 'Warna teks'], ['accentColor', 'Warna aksen']] as const).map(([key, label]) => <Field key={key} label={label}><input type="color" value={section[key]} onChange={e => change({ [key]: e.target.value })}/></Field>)}
     {(["desktop", "mobile"] as const).map(view => <div key={view} className={s.group}><h3>{view === "desktop" ? "Desktop" : "Mobile"}</h3><Field label={`Spacing vertikal · ${section[view].padding}px`}><input type="range" min="0" max="160" value={section[view].padding} onChange={e => change({ [view]: { ...section[view], padding: Number(e.target.value) } })}/></Field><Field label={`Jarak elemen · ${section[view].gap}px`}><input type="range" min="0" max="80" value={section[view].gap} onChange={e => change({ [view]: { ...section[view], gap: Number(e.target.value) } })}/></Field><Field label="Alignment"><select value={section[view].align} onChange={e => change({ [view]: { ...section[view], align: e.target.value } })}><option value="left">Kiri</option><option value="center">Tengah</option></select></Field><label><input type="checkbox" checked={section[view].reverse} onChange={e => change({ [view]: { ...section[view], reverse: e.target.checked } })}/> Balik urutan teks dan foto</label></div>)}
     <button disabled={document.sections.length >= 30} onClick={() => { const copy = { ...structuredClone(section), visible: section.type !== "hero", id: `${section.type}-${crypto.randomUUID().slice(0, 8)}`, verified: false, verifiedAt: "" }; setDocument({ ...document, sections: [...document.sections, copy] }); setSelected(copy.id); }}><Copy size={16}/>Duplikasi section</button><button disabled={document.sections.length === 1} onClick={removeSection}><Trash2 size={16}/>Hapus section</button>
    </>}
    {tab === "review" && <>
     <p>Konfirmasi berdasarkan catatan internal dan status aktual. Mengubah teks atau foto membatalkan verifikasi section.</p>
     <label><input type="checkbox" checked={requiresVerification(section)} disabled={["hero","story","store","operations"].includes(section.type)} onChange={e => change({ requiresReview: e.target.checked, verified: false, verifiedAt: "" })}/> Memerlukan verifikasi sebelum Publish</label>
     <Field label="Catatan pemeriksaan"><textarea value={section.reviewNote} onChange={e => change({ reviewNote: e.target.value })}/></Field>
     <Field label="Tanggal acuan data / konfirmasi"><input type="date" value={section.verifiedAt} onChange={e => change({ verifiedAt: e.target.value })}/></Field>
     <label><input type="checkbox" checked={section.verified} onChange={e => change({ verified: e.target.checked })}/> Informasi sudah dikonfirmasi</label>
    </>}
    </fieldset>
   </aside>
  </div>
  {preview && <div className={s.overlay} role="dialog" aria-modal="true" aria-label="Preview About Us"><div className={s.overlayBar}><strong>Preview · perubahan belum dipublikasikan</strong><div className={s.tools}><button onClick={() => setDevice(device === "desktop" ? "mobile" : "desktop")}>{device === "desktop" ? "Lihat mobile" : "Lihat desktop"}</button><button autoFocus onClick={() => setPreview(false)}><X size={18}/>Tutup</button></div></div><div className={s.fullCanvas}>{canvas}</div></div>}
  {history && <div className={s.scrim}><section className={s.dialog} role="dialog" aria-modal="true" aria-label="Riwayat versi"><button autoFocus onClick={() => setHistory(false)} className={s.close}><X size={18}/>Tutup</button><h2>Riwayat versi</h2><p>Restore mengganti draft. Versi publik tetap sampai Anda melakukan Publish.</p>{!state.versions.length && <p>Belum ada versi tersimpan.</p>}{state.versions.map(version => <div className={s.version} key={version.id}><div><strong>Versi {version.revision} · {version.action}</strong><p>{new Date(version.createdAt).toLocaleString("id-ID")} · {version.actor}</p></div><button disabled={!canUpdate || busy || dirty} onClick={() => commit({ action: "restore", versionId: version.id, expectedRevision: state.revision })}>Restore ke draft</button></div>)}{dirty && <p>Simpan draft sebelum melakukan Restore.</p>}</section></div>}
  {confirmPublish && <div className={s.scrim}><section className={s.dialog} role="dialog" aria-modal="true" aria-label="Konfirmasi Publish"><h2>Publikasikan versi {state.revision}?</h2><p>Halaman publik akan memakai draft tersimpan ini. Tindakan ini tidak melakukan deployment kode.</p>{issues.length > 0 ? <ul>{issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul> : <p>Seluruh pemeriksaan konten selesai. Aset ilustrasi tetap diberi penanda.</p>}<div className={s.tools}><button autoFocus onClick={() => setConfirmPublish(false)}>Batal</button><button className={s.publish} disabled={issues.length > 0 || busy} onClick={() => commit({ action: "publish", expectedRevision: state.revision })}>Publish sekarang</button></div></section></div>}
 </div>;
}
