"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
interface Row { id: number; sku: string; size: string; label: string; quantity: number | null }
export function StockVariantEditor({ productId }: { productId: number }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function load() {
    if (rows || busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/products/woocommerce/${productId}/stock-variants`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Daftar SKU belum dapat dimuat.");
      setRows(result.rows);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Daftar SKU belum dapat dimuat."); }
    finally { setBusy(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!rows?.length || busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/products/woocommerce/${productId}/stock-variants`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: rows.map(({ id, sku, size }) => ({ id, sku, size })) }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "SKU belum tersimpan.");
      setRows(result.rows); setMessage("SKU tersimpan. Sinkronkan produk toko di Ginee, periksa binding MSKU, lalu Push Stock."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "SKU belum tersimpan."); }
    finally { setBusy(false); }
  }
  return <details className="rounded-2xl border border-line bg-white p-5" onToggle={event => { if (event.currentTarget.open) void load(); }}>
    <summary className="cursor-pointer text-sm font-bold text-ink">Pemetaan SKU stok per ukuran</summary>
    <p className="mt-3 text-xs leading-5 text-ink-muted">Isi SKU lengkap persis seperti Ginee, termasuk tanda hubung, garis bawah, dan 2XL/XXL. Pengaturan ini mempertahankan ID varian dan tidak mengisi atau mengubah jumlah stok.</p>
    {busy && !rows && <p role="status" className="mt-3 text-sm">Memuat SKU…</p>}
    {rows && !rows.length && <p className="mt-3 text-sm">Belum ada varian. Lengkapi ukuran dan simpan produk; untuk beberapa warna, lengkapi SKU dan foto per warna.</p>}
    {rows && rows.length > 0 && <form onSubmit={save} className="mt-4 space-y-4">
      <div className="max-h-[32rem] overflow-auto"><table className="w-full text-left text-xs">
        <caption className="sr-only">SKU dan ukuran varian WooCommerce</caption>
        <thead><tr><th className="p-2">Varian</th><th className="p-2">Ukuran</th><th className="p-2">SKU Ginee</th><th className="p-2">Stok WooCommerce</th></tr></thead>
        <tbody>{rows.map((row, index) => <tr key={row.id} className="border-t border-line">
          <td className="min-w-32 p-2">#{row.id}<span className="block text-ink-muted">{row.label}</span></td>
          <td className="p-2"><select required disabled={busy} aria-label={`Ukuran varian ${row.id}`} className="min-h-11 rounded-lg border border-line p-2" value={row.size} onChange={event => setRows(current => current!.map((r, i) => i === index ? { ...r, size: event.target.value } : r))}>
            <option value="">Pilih ukuran</option>{["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"].map(size => <option key={size}>{size}</option>)}
          </select></td>
          <td className="p-2"><input required disabled={busy} aria-label={`SKU varian ${row.id}`} maxLength={100} pattern="[A-Za-z0-9._\-]+" className="min-h-11 min-w-52 rounded-lg border border-line px-3" value={row.sku} onChange={event => setRows(current => current!.map((r, i) => i === index ? { ...r, sku: event.target.value } : r))} /></td>
          <td className="whitespace-nowrap p-2">{row.quantity == null ? "Belum tersinkron" : `${row.quantity} pcs`}</td>
        </tr>)}</tbody>
      </table></div>
      <button disabled={busy} className="min-h-11 rounded-lg bg-brand-700 px-4 text-sm font-bold text-white disabled:opacity-50" type="submit">{busy ? "Menyimpan…" : "Simpan pemetaan SKU"}</button>
    </form>}
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
  </details>;
}
