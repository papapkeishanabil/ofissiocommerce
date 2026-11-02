"use client";

import type { SizeChartStandard } from "@/features/size-charts/size-chart.types";
import type { SleeveSizeChartIds } from "@/features/size-charts/sleeve-size-chart-settings";
import { NO_SIZE_CHART } from "@/features/size-charts/size-chart-selection";

const input = "min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[15px] font-medium text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
interface Props {
  dual: boolean;
  standards: SizeChartStandard[];
  automaticName?: string;
  baseId?: string;
  onBaseChange: (value: string) => void;
  sleeveIds: SleeveSizeChartIds;
  onSleeveChange: (sleeve: "short" | "long", value: string) => void;
}

export function ProductSizeChartFields({ dual, standards, automaticName, baseId, onBaseChange, sleeveIds, onSleeveChange }: Props) {
  const options = (value?: string) => <>
    {standards.map(chart => <option key={chart.id} value={chart.id}>{chart.name}</option>)}
    {value && value !== NO_SIZE_CHART && !standards.some(chart => chart.id === value) && <option value={value} disabled>Standar tidak tersedia untuk gender ini</option>}
    <option value={NO_SIZE_CHART}>Tanpa panduan ukuran</option>
  </>;
  return <fieldset className="min-w-0 space-y-2">
    <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Standar ukuran</legend>
    {dual ? <>
      <p className="rounded-lg border border-line bg-slate-50 px-3 py-2.5 text-sm font-medium text-ink">Mengikuti varian lengan</p>
      {([['short', 'Lengan pendek'], ['long', 'Lengan panjang']] as const).map(([key, label]) => <label key={key} className="block text-sm font-medium text-ink">
        {label}
        <select aria-label={`Standar ukuran ${label.toLowerCase()}`} className={`${input} mt-1`} value={sleeveIds[key]} onChange={event => onSleeveChange(key, event.target.value)}>{options(sleeveIds[key])}</select>
      </label>)}
      <p className="text-xs leading-5 text-slate-500">Tabel ukuran pelanggan mengikuti pilihan lengan. Pilih standar khusus jika model ini membutuhkannya.</p>
    </> : <>
      <select aria-label="Standar ukuran" className={input} value={baseId ?? ""} onChange={event => onBaseChange(event.target.value)}>
        <option value="">Otomatis — {automaticName ?? "belum ada standar yang cocok"}</option>
        {options(baseId)}
      </select>
      <p className="text-xs leading-5 text-slate-500">Pilihan otomatis mengikuti kategori dan gender. Pilih standar lain untuk menetapkannya khusus pada produk ini.</p>
    </>}
  </fieldset>;
}
