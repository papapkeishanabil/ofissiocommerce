"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, CircleDollarSign, RotateCcw, Save, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { createDefaultEmbroideryPricingZones, type EmbroideryPricingZone } from "@/features/products/embroidery-pricing";

type InitialState = {
  zones: EmbroideryPricingZone[];
  source: "supabase" | "mock" | "fallback";
  schemaReady: boolean;
};

export function EmbroideryPricingManager({ initialState, canUpdate }: { initialState: InitialState; canUpdate: boolean }) {
  const [zones, setZones] = useState(() => initialState.zones.map((zone) => ({ ...zone })));
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update(index: number, patch: Partial<EmbroideryPricingZone>) {
    setZones((current) => current.map((zone, zoneIndex) => zoneIndex === index ? { ...zone, ...patch } : zone));
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/admin/pricing/embroidery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-ofissio-internal-role": "product_admin", "x-ofissio-internal-user-id": "product-admin-dev" },
        body: JSON.stringify({ zones }),
      });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string; zones?: EmbroideryPricingZone[] };
      if (!response.ok || !result.ok) {
        setMessage(result.message ?? "Harga bordir belum dapat disimpan.");
        return;
      }
      if (result.zones) setZones(result.zones);
      setMessage("Master harga bordir berhasil disimpan dan siap dipakai pada transaksi berikutnya.");
    });
  }

  return (
    <section className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-brand-50 px-3 text-xs font-black uppercase tracking-[0.14em] text-brand-700"><CircleDollarSign className="h-4 w-4" />Flat per piece</span>
            <span className={`inline-flex min-h-8 items-center gap-2 rounded-full px-3 text-xs font-black uppercase tracking-[0.14em] ${initialState.schemaReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
              {initialState.schemaReady ? <CheckCircle2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              {initialState.source}
            </span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-muted">Harga per zona dikalikan total qty. Setup fee hanya ditambahkan bila opsi tampilkan setup fee diaktifkan.</p>
        </div>
        {canUpdate ? <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => setZones(createDefaultEmbroideryPricingZones())}><RotateCcw className="h-4 w-4" />Reset nilai awal</Button><Button type="button" onClick={save} disabled={isPending}><Save className="h-4 w-4" />{isPending ? "Menyimpan..." : "Simpan master"}</Button></div> : null}
      </div>

      {!initialState.schemaReady ? <div role="alert" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">Migration 011 belum aktif. Nilai aman bawaan ditampilkan hanya sebagai fallback; penyimpanan Supabase belum tersedia.</div> : null}
      {!canUpdate ? <div role="note" className="mt-5 rounded-2xl border border-line bg-slate-50 p-4 text-sm font-semibold text-ink-muted">Role Anda memiliki akses baca. Perubahan master hanya tersedia untuk super admin dan product admin.</div> : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {zones.map((zone, index) => (
          <fieldset key={zone.zoneId} disabled={!canUpdate || isPending} className="min-w-0 rounded-2xl border border-line/80 bg-slate-50/70 p-4">
            <legend className="sr-only">Harga bordir {zone.label}</legend>
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="font-black text-ink">{zone.label}</h2><p className="mt-1 font-mono text-xs text-brand-700">{zone.zoneId}</p></div>
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-bold text-ink"><input suppressHydrationWarning type="checkbox" checked={zone.enabled} onChange={(event) => update(index, { enabled: event.target.checked })} className="h-4 w-4 accent-brand-700" />Aktif</label>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <NumberField label="Maks lebar (cm)" value={zone.maxWidthCm} step="0.1" onChange={(value) => update(index, { maxWidthCm: value })} />
              <NumberField label="Maks tinggi (cm)" value={zone.maxHeightCm} step="0.1" onChange={(value) => update(index, { maxHeightCm: value })} />
              <NumberField label="Harga / pcs (Rp)" value={zone.unitPrice} step="500" onChange={(value) => update(index, { unitPrice: value })} />
              <NumberField label="Setup fee (Rp)" value={zone.setupFee} step="1000" onChange={(value) => update(index, { setupFee: value })} />
            </div>
            <label className="mt-3 flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-bold text-ink"><input suppressHydrationWarning type="checkbox" checked={zone.showSetupFee} onChange={(event) => update(index, { showSetupFee: event.target.checked })} className="h-4 w-4 accent-brand-700" />Terapkan setup fee pada perhitungan</label>
            <label className="mt-3 block text-sm font-bold text-ink">Catatan<input suppressHydrationWarning value={zone.notes ?? ""} maxLength={500} onChange={(event) => update(index, { notes: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3 text-sm font-normal focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" /></label>
          </fieldset>
        ))}
      </div>
      {message ? <p role="status" aria-live="polite" className="mt-5 rounded-xl bg-brand-50 px-4 py-3 text-sm font-bold text-brand-800">{message}</p> : null}
    </section>
  );
}

function NumberField({ label, value, step, onChange }: { label: string; value: number; step: string; onChange: (value: number) => void }) {
  return <label className="block text-sm font-bold text-ink">{label}<input suppressHydrationWarning type="number" min={0} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3 text-sm font-normal tabular-nums focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" /></label>;
}
