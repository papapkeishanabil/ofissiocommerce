"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ListOrdered, RotateCcw, Save, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { DEFAULT_MOQ_SETTINGS, type MoqSettings } from "@/features/moq-settings/moq-settings.types";

type InitialState = {
  settings: MoqSettings;
  source: "supabase" | "mock" | "fallback";
  schemaReady: boolean;
};

const DEV_INTERNAL_HEADERS = {
  "x-ofissio-internal-role": "product_admin",
  "x-ofissio-internal-user-id": "product-admin-dev",
} as const;

const ROUTE_FIELDS: Array<{
  key: keyof MoqSettings;
  label: string;
  routeLabel: string | null;
  hint: string;
}> = [
  {
    key: "fulfillment",
    label: "MOQ Ready Stock (STK)",
    routeLabel: "STK",
    hint: "Default produk rute fulfillment. Ready stock umumnya bisa dibeli mulai 1 pcs.",
  },
  {
    key: "customization",
    label: "MOQ Custom (CUS)",
    routeLabel: "CUS",
    hint: "Default produk rute customization. Pembelian tanpa bordir mengikuti nilai ini.",
  },
  {
    key: "production",
    label: "MOQ Production (PRO)",
    routeLabel: "PRO",
    hint: "Acuan peringatan form Full Custom — bukan blokir; pengecualian ditangani sales.",
  },
  {
    key: "embroidery",
    label: "Minimum bordir (pcs)",
    routeLabel: null,
    hint: "Batas keras: line dengan logo bordir 3D atau catatan mengandung kata bordir minimal sebanyak ini.",
  },
];

export function MoqSettingsManager({ initialState, canUpdate }: { initialState: InitialState; canUpdate: boolean }) {
  const [settings, setSettings] = useState<MoqSettings>(() => ({ ...initialState.settings }));
  const [message, setMessage] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update(key: keyof MoqSettings, value: number) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/admin/settings/moq", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...DEV_INTERNAL_HEADERS },
        body: JSON.stringify(settings),
      });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string; settings?: MoqSettings };
      if (!response.ok || !result.ok) {
        setMessage(result.message ?? "Master MOQ belum dapat disimpan.");
        return;
      }
      if (result.settings) setSettings(result.settings);
      setMessage("Master MOQ berhasil disimpan dan berlaku pada transaksi berikutnya.");
    });
  }

  function bulkApply(field: (typeof ROUTE_FIELDS)[number]) {
    if (!field.routeLabel) return;
    const routeKey = field.key === "fulfillment" || field.key === "customization" || field.key === "production" ? field.key : null;
    if (!routeKey) return;
    const moq = Math.max(1, Math.trunc(settings[routeKey]) || 1);
    const confirmed = window.confirm(
      `Terapkan MOQ ${moq} pcs ke semua produk rute ${field.routeLabel}? MOQ tiap produk rute ini akan ditimpa.`,
    );
    if (!confirmed) return;
    setBulkBusy(routeKey);
    setMessage(null);
    void (async () => {
      try {
        const response = await fetch("/api/admin/settings/moq/bulk-apply", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...DEV_INTERNAL_HEADERS },
          body: JSON.stringify({ processRoute: routeKey, moq }),
        });
        const result = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string; updatedCount?: number };
        if (!response.ok || !result.ok) {
          setMessage(result.message ?? "MOQ massal belum dapat diterapkan.");
          return;
        }
        setMessage(`MOQ ${result.updatedCount ?? 0} produk rute ${field.routeLabel} diperbarui menjadi ${moq} pcs.`);
      } finally {
        setBulkBusy(null);
      }
    })();
  }

  const busy = isPending || bulkBusy != null;

  return (
    <section className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-brand-50 px-3 text-xs font-black uppercase tracking-[0.14em] text-brand-700"><ListOrdered className="h-4 w-4" />Per rute pengerjaan</span>
            <span className={`inline-flex min-h-8 items-center gap-2 rounded-full px-3 text-xs font-black uppercase tracking-[0.14em] ${initialState.schemaReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
              {initialState.schemaReady ? <CheckCircle2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              {initialState.source}
            </span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-muted">
            Belanja ready stock dibuka mulai 1 pcs; bordir punya minimum sendiri; Full Custom diarahkan lewat peringatan. Ubah nilainya di sini sekali, lalu terapkan massal bila perlu.
          </p>
        </div>
        {canUpdate ? <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => setSettings({ ...DEFAULT_MOQ_SETTINGS })}><RotateCcw className="h-4 w-4" />Kembalikan default</Button><Button type="button" onClick={save} disabled={busy}><Save className="h-4 w-4" />{isPending ? "Menyimpan..." : "Simpan Master MOQ"}</Button></div> : null}
      </div>

      {!initialState.schemaReady ? <div role="alert" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">Migration 029 belum aktif. Nilai aman bawaan ditampilkan hanya sebagai fallback; penyimpanan Supabase belum tersedia.</div> : null}
      {!canUpdate ? <div role="note" className="mt-5 rounded-2xl border border-line bg-slate-50 p-4 text-sm font-semibold text-ink-muted">Role Anda memiliki akses baca. Perubahan master hanya tersedia untuk super admin dan product admin.</div> : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {ROUTE_FIELDS.map((field) => (
          <fieldset key={field.key} disabled={!canUpdate || busy} className="min-w-0 rounded-2xl border border-line/80 bg-slate-50/70 p-4">
            <legend className="sr-only">{field.label}</legend>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block text-sm font-bold text-ink">
                {field.label}
                <input
                  suppressHydrationWarning
                  type="number"
                  min={1}
                  step={1}
                  value={settings[field.key]}
                  onChange={(event) => update(field.key, Number(event.target.value))}
                  className="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3 text-sm font-normal tabular-nums focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>
              {canUpdate && field.routeLabel ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy || bulkBusy === field.key}
                  onClick={() => bulkApply(field)}
                >
                  {bulkBusy === field.key ? "Menerapkan..." : `Terapkan ke semua produk ${field.routeLabel}`}
                </Button>
              ) : null}
            </div>
            <p className="mt-2 text-xs leading-5 text-ink-muted">{field.hint}</p>
          </fieldset>
        ))}
      </div>
      {message ? <p role="status" aria-live="polite" className="mt-5 rounded-xl bg-brand-50 px-4 py-3 text-sm font-bold text-brand-800">{message}</p> : null}
    </section>
  );
}
