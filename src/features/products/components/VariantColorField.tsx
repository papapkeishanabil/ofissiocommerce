"use client";

import { useId, useState } from "react";
import { fabricColorForName } from "@/lib/product-colors";

const INPUT = "min-h-11 w-full min-w-0 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700";
const validHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value);
const rgbValues = (hex: string) => [1, 3, 5].map(offset => String(parseInt(hex.slice(offset, offset + 2), 16)));

export function VariantColorField({ name, value, onChange }: {
  name: string; value?: string; onChange: (value: string) => void;
}) {
  const id = useId();
  const [hexDraft, setHexDraft] = useState<string | null>(null);
  const [rgbDraft, setRgbDraft] = useState<string[] | null>(null);
  const saved = !!value && validHex(value);
  const hex = saved ? value : fabricColorForName(name);
  const channels = rgbDraft ?? rgbValues(hex);
  function pick(next: string) { setHexDraft(null); setRgbDraft(null); onChange(next); }
  return <fieldset className="min-w-0 space-y-3 rounded-xl border border-line bg-white p-4" aria-describedby={`${id}-hint`}>
    <legend className="px-1 text-sm font-semibold text-ink">{name}</legend>
    <div className="flex items-end gap-3">
      <label className="text-xs font-semibold text-ink">Pilih warna
        <input aria-label={`Pilih warna ${name}`} type="color" value={hex} onChange={event => pick(event.target.value)} className="mt-2 block h-11 w-14 cursor-pointer rounded-lg border border-line bg-white p-1" />
      </label>
      <label className="min-w-0 flex-1 text-xs font-semibold text-ink">HEX
        <input aria-label={`HEX ${name}`} className={`${INPUT} mt-2`} value={hexDraft ?? hex.toUpperCase()} pattern="#[0-9a-fA-F]{6}" title="Gunakan # diikuti enam digit HEX, misalnya #B69A84." required maxLength={7} spellCheck={false} onChange={event => {
          const next = event.target.value;
          setHexDraft(next); setRgbDraft(null);
          if (validHex(next)) onChange(next.toLowerCase());
        }} onBlur={() => { if (hexDraft && validHex(hexDraft)) setHexDraft(null); }} />
      </label>
    </div>
    <div className="grid grid-cols-3 gap-2" role="group" aria-label={`RGB ${name}`}>
      {["R", "G", "B"].map((channel, index) => <label key={channel} className="min-w-0 text-xs font-semibold text-ink">{channel}
        <input aria-label={`${channel} ${name}`} type="number" min={0} max={255} step={1} required className={`${INPUT} mt-2`} value={channels[index] ?? ""} onChange={event => {
          const next = [...channels]; next[index] = event.target.value; setRgbDraft(next); setHexDraft(null);
          if (next.every(value => /^\d+$/.test(value) && Number(value) <= 255)) {
            onChange(`#${next.map(value => Number(value).toString(16).padStart(2, "0")).join("")}`);
          }
        }} />
      </label>)}
    </div>
    <p id={`${id}-hint`} className="text-xs leading-5 text-ink-muted">{saved ? "Warna khusus. Simpan produk untuk menerapkannya." : "Perkiraan dari nama warna. Sesuaikan dengan foto atau sampel kain."}</p>
    <button type="button" className="min-h-11 text-left text-xs font-semibold text-brand-700 underline underline-offset-4" onClick={() => pick("")}>Gunakan perkiraan nama warna</button>
  </fieldset>;
}
