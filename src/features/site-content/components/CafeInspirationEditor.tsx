"use client";

import { useState } from "react";
import { CAFE_ROLES, RESTAURANT_ROLES, type BusinessKind } from "../cafe-inspiration.data";
import { cafeAnnotations } from "../cafe-inspiration-pins";
import type { IndustryInspirationAnnotation, IndustryInspirationData } from "../content.schema";
import { CafeAnnotatedPhoto } from "@/components/industry-inspiration/CafeAnnotatedPhoto";

export function CafeInspirationEditor({ value, onChange }: { value: IndustryInspirationData; onChange: (value: IndustryInspirationData) => void }) {
  const [business, setBusiness] = useState<BusinessKind>("cafe");
  const [roleId, setRoleId] = useState("barista");
  const [mode, setMode] = useState<"team" | "uniform">("team");
  const roles = business === "cafe" ? CAFE_ROLES : RESTAURANT_ROLES;
  const role = roles.find((item) => item.id === roleId) ?? roles[0]!;
  const key = `${business}:${role.id}:${mode}`;
  const pins = cafeAnnotations(business, role, mode, value.cafePlacements);
  function save(annotations: IndustryInspirationAnnotation[]) {
    onChange({ ...value, cafePlacements: [...(value.cafePlacements ?? []).filter((item) => item.key !== key), { key, annotations }] });
  }
  function patch(index: number, change: Partial<IndustryInspirationAnnotation>) {
    save(pins.map((pin, i) => i === index ? { ...pin, ...change } : pin));
  }
  const selectClass = "mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm";
  return <section className="space-y-5 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-6" aria-label="Editor pin Kafe dan Restoran">
    <div><h3 className="text-lg font-bold">Posisi anotasi seragam</h3><p className="mt-1 text-sm text-slate-600">Pilih peran dan foto, lalu geser titik kuning ke bagian pakaian. Geser angka untuk mengatur label. Simpan perubahan halaman setelah selesai.</p></div>
    <div className="grid gap-4 sm:grid-cols-3">
      <label className="text-sm font-semibold">Jenis usaha<select className={selectClass} value={business} onChange={(event) => { setBusiness(event.target.value as BusinessKind); setRoleId(event.target.value === "cafe" ? "barista" : "service"); setMode("team"); }}><option value="cafe">Kafe</option><option value="restaurant">Restoran</option></select></label>
      <label className="text-sm font-semibold">Peran<select className={selectClass} value={role.id} onChange={(event) => { setRoleId(event.target.value); setMode("team"); }}>{roles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm font-semibold">Tampilan foto<select className={selectClass} value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="team">Fokus dalam Tim</option>{role.detailImage && <option value="uniform">Tampilan Seragam</option>}</select></label>
    </div>
    <div className="mx-auto max-w-5xl overflow-hidden rounded-xl bg-stone-200">
      <CafeAnnotatedPhoto key={key} image={mode === "uniform" ? role.detailImage! : role.focusImage} alt={`Pratinjau ${role.name}`} ratio={business === "cafe" && mode === "team" ? 1586 / 992 : 1.5} annotations={pins}
        onMove={(index, point, x, y) => patch(index, point === "anchor" ? { anchorX: x, anchorY: y } : { labelX: x, labelY: y })} />
    </div>
    <p className="text-sm text-slate-600">Posisi memakai persentase gambar utuh agar tetap sesuai di berbagai ukuran layar. Tampilan Semua Tim tidak memakai anotasi.</p>
    <div className="grid gap-3 lg:grid-cols-3">{pins.map((pin, index) => <fieldset key={pin.id} className="min-w-0 space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <legend className="px-1 text-sm font-bold">Pin {pin.number}</legend>
      <label className="block text-sm">Teks label<input className={selectClass} value={pin.title} maxLength={90} onChange={(event) => patch(index, { title: event.target.value })} /></label>
      <div className="grid grid-cols-2 gap-3">{([['anchorX', 'Titik X'], ['anchorY', 'Titik Y'], ['labelX', 'Label X'], ['labelY', 'Label Y']] as const).map(([field, label]) => <label key={field} className="text-xs text-slate-600">{label} (%)<input type="number" className={selectClass} min={0} max={100} step={0.1} value={pin[field]} onChange={(event) => { const n = event.target.valueAsNumber; if (Number.isFinite(n)) patch(index, { [field]: Math.max(0, Math.min(100, n)) }); }} /></label>)}</div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pin.hidden} onChange={(event) => patch(index, { hidden: event.target.checked })} />Sembunyikan pin ini</label>
    </fieldset>)}</div>
    <button type="button" className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold" onClick={() => save(cafeAnnotations(business, role, mode))}>Reset pin untuk foto ini</button>
  </section>;
}
