import type { ProductSizeRow } from "@/types/product";
import { Scale } from "lucide-react";
import styles from "./ProductSizeChart.module.css";
import { SIZE_CHART_MEASUREMENTS } from "@/features/size-charts/size-chart.metrics";

export function ProductSizeChart({ rows, name }: { rows: ProductSizeRow[]; name?: string }) {
  const metrics = SIZE_CHART_MEASUREMENTS.filter(metric => rows.some(row => (row[metric.field] ?? 0) > 0));
  const hasWeight = rows.some(row => (row.weightMin ?? 0) > 0 && (row.weightMax ?? 0) > 0);
  return <div className={styles.chart} data-product-size-chart>
    {name ? <p className="mb-2 text-xs font-bold text-ink">{name}</p> : null}
    <div className="max-w-full overflow-x-auto rounded-lg border border-line" tabIndex={0} role="region" aria-label="Tabel ukuran pakaian, geser untuk melihat seluruh kolom">
      <table className="w-full text-left text-xs">
        <caption className="sr-only">Ukuran pakaian dalam sentimeter</caption>
        <thead><tr className="border-b border-line bg-surface-muted">
          <th scope="col" className="px-3 py-2 font-semibold">Ukuran</th>
          {metrics.map(metric => <th key={metric.field} scope="col" className="min-w-24 px-3 py-2 text-right font-semibold">{metric.label}</th>)}
        </tr></thead>
        <tbody>{rows.map((row, index) => <tr key={row.size} className={index % 2 ? "bg-surface-muted/60" : undefined}>
          <th scope="row" className="px-3 py-2 font-semibold">{row.size}</th>
          {metrics.map(metric => <td key={metric.field} className="px-3 py-2 text-right tabular-nums">{(row[metric.field] ?? 0) > 0 ? row[metric.field] : "—"}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
    <p className="mt-1 text-xs leading-5 text-ink-muted">Geser tabel untuk melihat seluruh kolom pengukuran.</p>
    <p className="mt-2 text-xs leading-5 text-ink-muted">Ukuran pakaian dalam cm. Bandingkan dengan ukuran pakaian yang biasa Anda gunakan.</p>
    {hasWeight ? <section className={styles.weightGuide} aria-label="Rekomendasi ukuran berdasarkan berat badan">
      <div className={styles.heading}>
        <span className={styles.weightIcon}><Scale size={18} aria-hidden="true" /></span>
        <div><h3 className={styles.title}>Panduan berat badan</h3><p className={styles.subtitle}>Temukan perkiraan ukuran Anda</p></div>
      </div>
      <dl className={styles.weightGrid}>{rows.filter(row => (row.weightMin ?? 0) > 0 && (row.weightMax ?? 0) > 0).map(row => <div key={row.size} className={styles.weightItem}>
        <dt className={styles.sizeBadge}><span className="sr-only">Ukuran </span>{row.size}</dt>
        <dd className={styles.weightRange}>{row.weightMin}–{row.weightMax}<span>kg</span></dd>
      </div>)}</dl>
      <p className={styles.weightNote}>Berat badan hanya panduan awal. Utamakan pengukuran pakaian pada tabel untuk menentukan ukuran yang sesuai.</p>
    </section> : null}
  </div>;
}
