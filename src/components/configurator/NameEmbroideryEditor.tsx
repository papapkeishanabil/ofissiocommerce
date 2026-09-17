"use client";
import { useId, useRef, useState } from "react";
import {
  CheckCircle2,
  ClipboardPaste,
  Download,
  FileSpreadsheet,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import type { LogoPlacement } from "@/types/uniform-3d";
import { renderNamePreview, namePreviewAspect } from "@/lib/embroidery-names";
import {
  compareEmbroideryNamesToOrder,
  EMBROIDERY_NAME_SIZES,
  parseEmbroideryNameList,
  type EmbroideryNameImportResult,
} from "@/lib/embroidery-name-import";
import styles from "./Studio.module.css";
type TextConfig = NonNullable<LogoPlacement["textBordir"]>;

type InputMethod = "upload" | "paste" | "manual";

const EMPTY_TEXT_CONFIG: TextConfig = {
  mode: "same",
  name: "",
  font: "sans",
  color: "#10245a",
  allocations: [],
};

export function NameEmbroideryEditor({ value, sizes, onApply, onDirty }: { value?: TextConfig; sizes: Record<string, number>; onApply: (text: TextConfig, preview: string, aspect: number) => void; onDirty: (dirty: boolean) => void }) {
  const [draft, setDraft] = useState<TextConfig>(value || EMPTY_TEXT_CONFIG);
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState("");
  const [inputMethod, setInputMethod] = useState<InputMethod>(value?.allocations.length ? "manual" : "upload");
  const [pasteValue, setPasteValue] = useState("");
  const [importResult, setImportResult] = useState<EmbroideryNameImportResult | null>(null);
  const [importSource, setImportSource] = useState("");
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const comparison = compareEmbroideryNamesToOrder(draft.allocations, sizes);

  function change(next: TextConfig) {
    setDraft(next);
    setImportResult(null);
    setImportSource("");
    onDirty(true);
    setError("");
  }

  function importNames(source: string, sourceLabel: string) {
    const result = parseEmbroideryNameList(source);
    setImportResult(result);
    setImportSource(sourceLabel);
    if (result.errors.length > 0) return;
    setDraft({ ...draft, allocations: result.allocations });
    onDirty(true);
    setError("");
    setSelected(0);
  }

  async function handleFile(file?: File) {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setImportResult({ allocations: [], errors: [{ message: "Ukuran file maksimal 1 MB." }], warnings: [] });
      setImportSource(file.name);
      return;
    }
    importNames(await file.text(), file.name);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function downloadTemplate() {
    const content = "\uFEFFNama Bordir,Ukuran,Jumlah\r\nANDI,S,1\r\nBUDI,M,1\r\nSARI,L,1\r\n";
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "template-daftar-nama-bordir.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function apply() {
    if (draft.mode === "same" ? !draft.name.trim() : !draft.allocations.length || draft.allocations.some(r => !r.name.trim() || r.quantity < 1)) { setError("Isi nama dan jumlah terlebih dahulu."); return; }
    const previewIndex = Math.min(selected, Math.max(0, draft.allocations.length - 1));
    onApply(draft, renderNamePreview(draft, previewIndex), namePreviewAspect(draft, previewIndex)); onDirty(false);
  }

  return <section className={styles.nameEditor} aria-label="Pengaturan bordir nama">
    <label className={styles.nameField}>Jenis pembagian
      <select value={draft.mode} onChange={e => change({ ...draft, mode: e.target.value as TextConfig["mode"] })}>
        <option value="same">Nama sama untuk semua seragam</option>
        <option value="individual">Nama berbeda untuk setiap seragam</option>
      </select>
    </label>

    {draft.mode === "same" ? <label className={styles.nameField}>Nama untuk preview
      <input maxLength={40} value={draft.name} placeholder="Contoh: ANDI" onChange={e => change({ ...draft, name: e.target.value })} />
      <span className={styles.help}>Preview bebas dicoba. Minimum quantity baru diperiksa saat memesan.</span>
    </label> : <div className={styles.individualNames}>
      <div className={styles.nameImportHeading}>
        <strong>Masukkan daftar nama</strong>
        <span>Gunakan CSV untuk daftar panjang atau isi manual untuk koreksi cepat.</span>
      </div>

      <div className={styles.nameMethods} aria-label="Cara memasukkan daftar nama">
        <button type="button" aria-pressed={inputMethod === "upload"} onClick={() => setInputMethod("upload")}><FileSpreadsheet aria-hidden="true" /> Unggah CSV</button>
        <button type="button" aria-pressed={inputMethod === "paste"} onClick={() => setInputMethod("paste")}><ClipboardPaste aria-hidden="true" /> Tempel dari Excel</button>
        <button type="button" aria-pressed={inputMethod === "manual"} onClick={() => setInputMethod("manual")}><Plus aria-hidden="true" /> Isi manual</button>
      </div>

      {inputMethod === "upload" && <div className={styles.nameImportPanel}>
        <input
          ref={fileInputRef}
          className={styles.srOnly}
          id={fileInputId}
          type="file"
          accept=".csv,text/csv"
          onChange={event => void handleFile(event.target.files?.[0])}
        />
        <label className={styles.nameUploadButton} htmlFor={fileInputId}><FileSpreadsheet aria-hidden="true" /> Pilih file CSV</label>
        <button type="button" className={styles.nameTemplateButton} onClick={downloadTemplate}><Download aria-hidden="true" /> Unduh template</button>
        <p>Template dapat dibuka dan diisi menggunakan Excel. Maksimal 500 baris atau 1 MB.</p>
      </div>}

      {inputMethod === "paste" && <div className={styles.namePastePanel}>
        <label htmlFor={`${fileInputId}-paste`}>Salin kolom Nama, Ukuran, dan Jumlah dari Excel</label>
        <textarea
          id={`${fileInputId}-paste`}
          rows={5}
          value={pasteValue}
          placeholder={"Nama Bordir\tUkuran\tJumlah\nAndi\tS\t1\nBudi\tM\t1"}
          onChange={event => setPasteValue(event.target.value)}
        />
        <button type="button" disabled={!pasteValue.trim()} onClick={() => importNames(pasteValue, "Data yang ditempel")}><ClipboardPaste aria-hidden="true" /> Gunakan daftar ini</button>
      </div>}

      {inputMethod === "manual" && draft.allocations.length === 0 && <button
        type="button"
        className={styles.nameManualStart}
        onClick={() => change({ ...draft, allocations: [{ name: "", size: "M", quantity: 1 }] })}
      ><Plus aria-hidden="true" /> Tambahkan nama pertama</button>}

      {importResult && importResult.errors.length > 0 && <div className={styles.nameImportError} role="alert">
        <TriangleAlert aria-hidden="true" />
        <div><strong>{importSource}: daftar belum digunakan</strong>
          <ul>{importResult.errors.slice(0, 4).map((issue, index) => <li key={`${issue.row}-${index}`}>{issue.row ? `Baris ${issue.row}: ` : ""}{issue.message}</li>)}</ul>
          {importResult.errors.length > 4 && <p>Masih ada {importResult.errors.length - 4} masalah lain.</p>}
        </div>
      </div>}

      {draft.allocations.length > 0 && <>
        <div className={styles.nameAllocationStatus} data-state={comparison.status} aria-live="polite">
          {comparison.status === "match" ? <CheckCircle2 aria-hidden="true" /> : <TriangleAlert aria-hidden="true" />}
          <div>
            <strong>{draft.allocations.length} nama · {comparison.allocatedTotal} pcs</strong>
            {comparison.status === "no-order" && <span>Siap untuk preview. Pilih quantity per ukuran sebelum memesan.</span>}
            {comparison.status === "match" && <span>Daftar nama sudah cocok dengan quantity setiap ukuran.</span>}
            {comparison.status === "mismatch" && <span>{comparison.mismatches.map(row => `${row.size}: ${row.allocated} dari ${row.ordered} pcs`).join(" · ")}</span>}
          </div>
        </div>

        {importResult?.warnings.map(warning => <p className={styles.nameImportWarning} key={warning}><TriangleAlert aria-hidden="true" /> {warning}</p>)}

        <details className={styles.nameAllocationList} open={draft.allocations.length <= 6}>
          <summary>Periksa dan koreksi daftar ({draft.allocations.length})</summary>
          <div className={styles.nameTable}>
            <div className={styles.nameTableHeader} aria-hidden="true"><span>Nama bordir</span><span>Ukuran</span><span>Jumlah</span><span /></div>
            {draft.allocations.map((row, i) => <div className={styles.nameRow} key={i}>
              <input aria-label={`Nama ${i + 1}`} maxLength={40} value={row.name} placeholder="Nama" onChange={e => change({ ...draft, allocations: draft.allocations.map((item,j) => j === i ? { ...item, name: e.target.value } : item) })} />
              <select aria-label={`Ukuran ${i + 1}`} value={row.size} onChange={e => change({ ...draft, allocations: draft.allocations.map((item,j) => j === i ? { ...item, size: e.target.value as typeof row.size } : item) })}>{EMBROIDERY_NAME_SIZES.map(size => <option key={size}>{size}</option>)}</select>
              <input aria-label={`Jumlah ${i + 1}`} type="number" min={1} max={100000} value={row.quantity} onChange={e => change({ ...draft, allocations: draft.allocations.map((item,j) => j === i ? { ...item, quantity: Math.max(0, Math.floor(Number(e.target.value))) } : item) })} />
              <button type="button" className={styles.nameDelete} aria-label={`Hapus nama ${i + 1}`} onClick={() => { change({ ...draft, allocations: draft.allocations.filter((_,j) => j !== i) }); setSelected(current => Math.max(0, Math.min(current, draft.allocations.length - 2))); }}><Trash2 aria-hidden="true" /></button>
            </div>)}
          </div>
          <button type="button" className={styles.nameAddRow} disabled={draft.allocations.length >= 500} onClick={() => change({ ...draft, allocations: [...draft.allocations, { name: "", size: "M", quantity: 1 }] })}><Plus aria-hidden="true" /> Tambah baris</button>
        </details>

        <label className={styles.nameField}>Nama yang ditampilkan pada preview
          <select value={Math.min(selected,draft.allocations.length - 1)} onChange={e => setSelected(Number(e.target.value))}>{draft.allocations.map((row,i) => <option key={i} value={i}>{row.name || "Nama belum diisi"} · {row.size}</option>)}</select>
        </label>
      </>}
    </div>}

    <div className={styles.nameAppearance}>
      <label className={styles.nameField}>Font<select value={draft.font} onChange={e => change({ ...draft, font: e.target.value as TextConfig["font"] })}><option value="sans">Sans</option><option value="serif">Serif</option></select></label>
      <label className={styles.nameField}>Warna benang<input type="color" value={draft.color} onChange={e => change({ ...draft, color: e.target.value })} /></label>
    </div>
    {error && <p className={styles.nameFormError} role="alert">{error}</p>}
    <div className={styles.nameActions}>
      <button type="button" className={styles.applyNames} onClick={apply}>Terapkan ke preview</button>
      <button type="button" className={styles.cancelNames} onClick={() => { setDraft(value || EMPTY_TEXT_CONFIG); setError(""); setImportResult(null); onDirty(false); }}>Batalkan perubahan</button>
    </div>
  </section>;
}
