"use client";

import { useState, useTransition } from "react";
import { Calculator, CheckCircle2, Save, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { formatIDR } from "@/types/product";
import type { TaxSettingsState } from "../tax.types";

export function AdminTaxSettingsForm({
  initialState,
  canUpdate,
}: {
  initialState: TaxSettingsState;
  canUpdate: boolean;
}) {
  const [enabled, setEnabled] = useState(initialState.settings.enabled);
  const [rate, setRate] = useState(initialState.settings.rate);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();
  const exampleBase = 10_000_000;
  const exampleTax = enabled ? Math.round(exampleBase * rate / 100) : 0;

  function save() {
    setMessage(null);
    setIsError(false);
    startTransition(async () => {
      const response = await fetch("/api/admin/settings/tax", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-ofissio-internal-role": "super_admin",
          "x-ofissio-internal-user-id": "internal-dev",
        },
        body: JSON.stringify({ enabled, rate, label: "PPN" }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok) {
        setIsError(true);
        setMessage(result.message ?? "Pengaturan PPN belum dapat disimpan.");
        return;
      }
      setMessage("Pengaturan PPN berhasil disimpan untuk quotation berikutnya.");
    });
  }

  return (
    <section className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md md:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-brand-50 px-3 text-xs font-black uppercase tracking-[0.14em] text-brand-700">
              <Calculator className="h-4 w-4" aria-hidden="true" /> Default quotation
            </span>
            <span className={`inline-flex min-h-8 items-center gap-2 rounded-full px-3 text-xs font-black uppercase tracking-[0.14em] ${initialState.schemaReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
              {initialState.schemaReady ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <ShieldAlert className="h-4 w-4" aria-hidden="true" />}
              {initialState.source}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            Nilai ini menjadi default ketika quotation baru dibuat. Sales tetap dapat menonaktifkan PPN atau mengganti tarif untuk quotation tertentu sesuai permintaan klien.
          </p>
        </div>
        {canUpdate ? (
          <Button type="button" onClick={save} disabled={isPending || rate < 0 || rate > 100}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {isPending ? "Menyimpan..." : "Simpan pengaturan"}
          </Button>
        ) : null}
      </div>

      {!initialState.schemaReady ? (
        <div role="alert" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
          Migration 014 belum aktif. Sistem memakai fallback PPN 11%; pengaturan global belum dapat disimpan ke Supabase.
        </div>
      ) : null}

      <fieldset disabled={!canUpdate || isPending} className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
        <legend className="sr-only">Pengaturan PPN default</legend>
        <div className="rounded-2xl border border-line bg-slate-50 p-4 sm:p-5">
          <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-white px-4 py-3">
            <span>
              <span className="block font-black text-ink">Aktifkan PPN secara default</span>
              <span className="mt-1 block text-sm text-ink-muted">Dapat dioverride pada setiap quotation sebelum dikirim.</span>
            </span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="h-5 w-5 shrink-0 accent-brand-700"
            />
          </label>
          <label className="mt-4 block text-sm font-bold text-ink">
            Tarif PPN (%)
            <div className="relative mt-2">
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={rate}
                onChange={(event) => setRate(Number(event.target.value))}
                className="min-h-12 w-full rounded-xl border border-line bg-white px-4 pr-12 text-base font-semibold tabular-nums outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center font-bold text-ink-muted">%</span>
            </div>
          </label>
        </div>

        <div className="rounded-2xl bg-brand-950 p-5 text-white">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-200">Simulasi</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-brand-100">DPP setelah diskon</dt><dd className="font-bold tabular-nums">{formatIDR(exampleBase)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-brand-100">{enabled ? `PPN ${rate}%` : "PPN tidak dikenakan"}</dt><dd className="font-bold tabular-nums">{formatIDR(exampleTax)}</dd></div>
            <div className="border-t border-white/20 pt-3 flex justify-between gap-4"><dt className="font-black">Total</dt><dd className="text-lg font-black tabular-nums">{formatIDR(exampleBase + exampleTax)}</dd></div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-brand-100">Ongkir tidak dimasukkan ke dasar perhitungan PPN quotation.</p>
        </div>
      </fieldset>

      {!canUpdate ? (
        <p role="note" className="mt-5 rounded-xl border border-line bg-slate-50 px-4 py-3 text-sm font-semibold text-ink-muted">
          Role Anda memiliki akses baca. Perubahan hanya tersedia untuk super admin dan finance internal.
        </p>
      ) : null}
      {message ? (
        <p role={isError ? "alert" : "status"} aria-live="polite" className={`mt-5 rounded-xl px-4 py-3 text-sm font-bold ${isError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {message}
        </p>
      ) : null}
    </section>
  );
}
