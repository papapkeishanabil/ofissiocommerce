"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Plus, Ruler, RotateCcw, Save, ShieldAlert, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { SIZES } from "@/types/industry";
import {
  DEFAULT_SIZE_CHART_STANDARDS,
  type SizeChartRow,
  type SizeChartStandard,
} from "../size-chart.types";

const DEV_INTERNAL_HEADERS = {
  "x-ofissio-internal-role": "product_admin",
  "x-ofissio-internal-user-id": "product-admin-dev",
} as const;

const INPUT =
  "min-h-11 w-full rounded-xl border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";
const NUMBER_INPUT =
  "h-10 w-full rounded-lg border border-line bg-white px-2 text-center text-sm tabular-nums focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

type InitialState = {
  standards: SizeChartStandard[];
  source: "supabase" | "mock" | "fallback";
  schemaReady: boolean;
};

const METRICS = [
  { field: "chest", label: "Lingkar dada (cm)" },
  { field: "length", label: "Panjang badan (cm)" },
  { field: "shoulder", label: "Lebar bahu (cm)" },
  { field: "height", label: "Tinggi badan (cm)" },
] as const;

type MetricField = (typeof METRICS)[number]["field"];

export function SizeChartStandardsManager({ initialState, canUpdate }: { initialState: InitialState; canUpdate: boolean }) {
  const [standards, setStandards] = useState<SizeChartStandard[]>(() =>
    initialState.standards.map((standard) => ({ ...standard, rows: [...standard.rows] })),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateStandard(index: number, patch: Partial<SizeChartStandard>) {
    setStandards((current) => current.map((standard, i) => (i === index ? { ...standard, ...patch } : standard)));
  }

  function updateRow(index: number, size: SizeChartRow["size"], field: MetricField, value: number) {
    setStandards((current) =>
      current.map((standard, i) => {
        if (i !== index) return standard;
        const blankRow = (): SizeChartRow => ({ size, chest: 0, length: 0, shoulder: 0, height: 0 });
        return {
          ...standard,
          rows: standard.rows.some((row) => row.size === size)
            ? standard.rows.map((row) => (row.size === size ? { ...row, [field]: value } : row))
            : [...standard.rows, { ...blankRow(), [field]: value }],
        };
      }),
    );
  }

  function addStandard() {
    setStandards((current) => [
      ...current,
      {
        id: `standar-${Date.now().toString(36)}`,
        name: "Standar Baru",
        description: "",
        categorySlugs: [],
        isFallback: false,
        rows: SIZES.map((size) => ({ size, chest: 0, length: 0, shoulder: 0, height: 0 })),
      },
    ]);
  }

  function removeStandard(index: number) {
    setStandards((current) => current.filter((_, i) => i !== index));
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/admin/settings/size-charts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...DEV_INTERNAL_HEADERS },
        body: JSON.stringify({ standards }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        standards?: SizeChartStandard[];
      };
      if (!response.ok || !result.ok) {
        setMessage(result.message ?? "Standar ukuran belum dapat disimpan.");
        return;
      }
      if (result.standards) setStandards(result.standards.map((standard) => ({ ...standard, rows: [...standard.rows] })));
      setMessage("Standar ukuran tersimpan dan langsung tampil di produk yang cocok.");
    });
  }

  const busy = isPending;

  return (
    <section className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-brand-50 px-3 text-xs font-black uppercase tracking-[0.14em] text-brand-700"><Ruler className="h-4 w-4" />Panduan ukuran</span>
            <span className={`inline-flex min-h-8 items-center gap-2 rounded-full px-3 text-xs font-black uppercase tracking-[0.14em] ${initialState.schemaReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
              {initialState.schemaReady ? <CheckCircle2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              {initialState.source}
            </span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-muted">
            Satu standar ukuran per jenis produk. Produk otomatis mengikuti standar berdasarkan kategori WooCommerce-nya:
            produk kategori <strong>kemeja</strong> tampil size chart Kemeja, dan seterusnya. Urutan atas menang bila
            beberapa standar cocok; tandai <strong>fallback</strong> untuk produk di luar semua kategori.
          </p>
        </div>
        {canUpdate ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setStandards(DEFAULT_SIZE_CHART_STANDARDS.map((standard) => ({ ...standard, rows: [...standard.rows] })))}>
              <RotateCcw className="h-4 w-4" />Kembalikan default
            </Button>
            <Button type="button" onClick={addStandard} disabled={busy}>
              <Plus className="h-4 w-4" />Standar baru
            </Button>
            <Button type="button" onClick={save} disabled={busy}>
              <Save className="h-4 w-4" />{isPending ? "Menyimpan..." : "Simpan Standar Ukuran"}
            </Button>
          </div>
        ) : null}
      </div>

      {!initialState.schemaReady ? (
        <div role="alert" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
          Migration 038 belum aktif. Nilai bawaan ditampilkan hanya sebagai fallback; penyimpanan Supabase belum tersedia.
        </div>
      ) : null}
      {!canUpdate ? (
        <div role="note" className="mt-5 rounded-2xl border border-line bg-slate-50 p-4 text-sm font-semibold text-ink-muted">
          Role Anda memiliki akses baca. Perubahan standar ukuran hanya tersedia untuk super admin dan product admin.
        </div>
      ) : null}

      <div className="mt-6 space-y-5">
        {standards.map((standard, index) => (
          <fieldset key={standard.id + index} disabled={!canUpdate || busy} className="min-w-0 rounded-2xl border border-line/80 bg-slate-50/70 p-4">
            <legend className="sr-only">{standard.name}</legend>
            <div className="grid gap-3 md:grid-cols-[1.2fr_1.8fr_auto] md:items-end">
              <label className="block text-sm font-bold text-ink">
                Nama standar
                <input
                  value={standard.name}
                  onChange={(event) => updateStandard(index, { name: event.target.value })}
                  className={`mt-2 ${INPUT}`}
                  placeholder="cth: Kemeja Lengan Pendek"
                />
              </label>
              <label className="block text-sm font-bold text-ink">
                Kategori produk (slug WooCommerce, pisah koma)
                <input
                  value={standard.categorySlugs.join(", ")}
                  onChange={(event) =>
                    updateStandard(index, {
                      categorySlugs: event.target.value
                        .split(",")
                        .map((slug) => slug.trim().toLowerCase())
                        .filter(Boolean),
                    })
                  }
                  className={`mt-2 ${INPUT}`}
                  placeholder="cth: kemeja, kemeja-lapangan"
                />
              </label>
              <div className="flex items-center gap-3 md:pb-1">
                <label className="flex items-center gap-2 text-xs font-bold text-ink">
                  <input
                    type="checkbox"
                    checked={standard.isFallback === true}
                    onChange={(event) => updateStandard(index, { isFallback: event.target.checked })}
                    className="h-4 w-4 accent-[#2563eb]"
                  />
                  Fallback
                </label>
                {canUpdate ? (
                  <button
                    type="button"
                    onClick={() => removeStandard(index)}
                    aria-label={`Hapus ${standard.name}`}
                    className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-white text-ink-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
            <input
              value={standard.description ?? ""}
              onChange={(event) => updateStandard(index, { description: event.target.value })}
              className={`mt-3 ${INPUT}`}
              placeholder="Deskripsi singkat (opsional, tampil di halaman produk)"
              maxLength={160}
            />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[30rem] border-separate border-spacing-y-1 text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-ink-muted">
                    <th className="px-2 py-1 font-bold">Ukuran</th>
                    {SIZES.map((size) => (
                      <th key={size} className="px-1 py-1 text-center font-bold">{size}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map((metric) => (
                    <tr key={metric.field}>
                      <th scope="row" className="px-2 py-1 text-left text-xs font-bold text-ink">
                        {metric.label}
                      </th>
                      {SIZES.map((size) => {
                        const row = standard.rows.find((item) => item.size === size);
                        return (
                          <td key={size} className="px-1 py-1">
                            <input
                              type="number"
                              min={0}
                              max={300}
                              inputMode="numeric"
                              value={row?.[metric.field] ?? 0}
                              onChange={(event) => updateRow(index, size, metric.field, Math.max(0, Math.min(300, Math.trunc(Number(event.target.value)) || 0)))}
                              className={NUMBER_INPUT}
                              aria-label={`${metric.label} ${size}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </fieldset>
        ))}
      </div>
      {message ? <p role="status" aria-live="polite" className="mt-5 rounded-xl bg-brand-50 px-4 py-3 text-sm font-bold text-brand-800">{message}</p> : null}
    </section>
  );
}
