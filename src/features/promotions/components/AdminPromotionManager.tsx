"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, CircleStop, Plus, RefreshCw, TicketPercent } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { WooCommerceCategory, WooCommerceCoupon, WooCommerceProduct } from "@/features/products/woocommerce/woocommerce.types";

export function AdminPromotionManager() {
  const [promotions, setPromotions] = useState<WooCommerceCoupon[]>([]);
  const [products, setProducts] = useState<WooCommerceProduct[]>([]);
  const [categories, setCategories] = useState<WooCommerceCategory[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stoppingId, setStoppingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async (preserveMessage = false) => {
    setLoading(true);
    if (!preserveMessage) setMessage(null);
    try {
      const response = await fetch("/api/admin/promotions", { cache: "no-store" });
      const data = await response.json() as { ok?: boolean; promotions?: WooCommerceCoupon[]; products?: WooCommerceProduct[]; categories?: WooCommerceCategory[]; message?: string };
      if (!response.ok || !data.ok) throw new Error(data.message ?? "Gagal memuat promo.");
      setPromotions(data.promotions ?? []);
      setProducts(data.products ?? []);
      setCategories(data.categories ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat promo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setMessage(null);
    const form = new FormData(formElement);
    const payload = {
      code: form.get("code"),
      description: form.get("description"),
      discountType: form.get("discountType"),
      amount: Number(form.get("amount")),
      dateExpires: form.get("dateExpires") || null,
      minimumAmount: Number(form.get("minimumAmount") || 0),
      usageLimit: form.get("usageLimit") ? Number(form.get("usageLimit")) : null,
      usageLimitPerUser: form.get("usageLimitPerUser") ? Number(form.get("usageLimitPerUser")) : null,
      individualUse: true,
      excludeSaleItems: Boolean(form.get("excludeSaleItems")),
      productIds: selectedProductIds,
      categoryIds: selectedCategoryIds,
    };
    try {
      const response = await fetch("/api/admin/promotions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) throw new Error(data.message ?? "Promo gagal dibuat.");
      formElement.reset();
      setSelectedProductIds([]);
      setSelectedCategoryIds([]);
      setMessage("Promo berhasil dibuat dan langsung tersimpan di WooCommerce.");
      await load(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Promo gagal dibuat.");
    } finally {
      setSaving(false);
    }
  }

  async function stop(promotion: WooCommerceCoupon) {
    if (!window.confirm(`Hentikan promo ${promotion.code.toUpperCase()} sekarang? Kode tidak dapat digunakan lagi oleh pelanggan.`)) return;
    setStoppingId(promotion.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/promotions/${promotion.id}`, { method: "DELETE" });
      const data = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) throw new Error(data.message ?? "Promo gagal dihentikan.");
      setMessage(`Promo ${promotion.code.toUpperCase()} telah dihentikan.`);
      await load(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Promo gagal dihentikan.");
    } finally {
      setStoppingId(null);
    }
  }

  return <div className="grid min-w-0 gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
    <form onSubmit={submit} className="rounded-2xl bg-white p-5 shadow-[0_7px_22px_rgba(24,36,59,0.06)]">
      <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><Plus className="h-4 w-4" /></span><div><h2 className="text-sm font-bold">Buat promo</h2><p className="text-[11px] text-ink-muted">Langsung sinkron ke WooCommerce</p></div></div>
      <div className="mt-5 grid gap-3">
        <Field label="Kode promo"><input required name="code" placeholder="GAJIANOFISSIO" className={INPUT} /></Field>
        <Field label="Nama / deskripsi"><input name="description" placeholder="Promo gajian Agustus" className={INPUT} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Jenis diskon"><select name="discountType" className={INPUT}><option value="percent">Persentase</option><option value="fixed_cart">Potongan transaksi</option><option value="fixed_product">Potongan produk</option></select></Field><Field label="Nilai"><input required name="amount" type="number" min="1" className={INPUT} /></Field></div>
        <div className="grid grid-cols-2 gap-3"><Field label="Berlaku sampai"><input name="dateExpires" type="date" className={INPUT} /></Field><Field label="Minimum transaksi"><input name="minimumAmount" type="number" min="0" className={INPUT} /></Field></div>
        <div className="grid grid-cols-2 gap-3"><Field label="Batas total"><input name="usageLimit" type="number" min="1" className={INPUT} /></Field><Field label="Per pelanggan"><input name="usageLimitPerUser" type="number" min="1" className={INPUT} /></Field></div>
        <SelectionPicker
          label="Produk yang mendapat promo"
          helper="Kosongkan untuk berlaku pada semua produk."
          items={products.map((product) => ({ id: product.id, title: product.name, meta: product.sku ? `SKU ${product.sku}` : `Product ID ${product.id}` }))}
          selected={selectedProductIds}
          onChange={setSelectedProductIds}
          searchPlaceholder="Cari nama produk atau SKU"
        />
        <SelectionPicker
          label="Kategori yang mendapat promo"
          helper="Pilih kategori jika promo berlaku untuk seluruh produk di kategori tersebut."
          items={categories.map((category) => ({ id: category.id, title: category.name, meta: `${category.count ?? 0} produk` }))}
          selected={selectedCategoryIds}
          onChange={setSelectedCategoryIds}
          searchPlaceholder="Cari kategori"
        />
        <label className="flex items-center gap-2 text-xs text-ink-muted"><input name="excludeSaleItems" type="checkbox" /> Tidak berlaku untuk produk sale</label>
        <Button type="submit" disabled={saving} className="w-full">{saving ? "Menyimpan..." : "Buat dan sinkronkan"}</Button>
      </div>
    </form>
    <section className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-[0_7px_22px_rgba(24,36,59,0.06)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-bold">Promo WooCommerce</h2><p className="mt-0.5 text-[11px] text-ink-muted">Sumber data langsung dari toko</p></div><button type="button" onClick={() => void load()} className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50 text-ink-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button></div>
      {message ? <p className="mx-5 mt-4 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-800">{message}</p> : null}
      <div className="divide-y divide-slate-100">
        {promotions.map((promotion) => {
          const expired = Boolean(promotion.date_expires && Date.parse(promotion.date_expires) < Date.now());
          return <article key={promotion.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"><div className="min-w-0"><div className="flex items-center gap-2"><TicketPercent className="h-4 w-4 text-brand-700" /><strong className="truncate text-sm uppercase">{promotion.code}</strong><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${expired ? "bg-[#eef0f3] text-[#596273]" : "bg-emerald-50 text-emerald-700"}`}>{expired ? "Berakhir" : "Aktif"}</span></div><p className="mt-1 truncate text-[11px] text-ink-muted">{promotion.description || "Tanpa deskripsi"}</p></div><div className="text-xs font-bold text-ink">{promotion.discount_type === "percent" ? `${promotion.amount}%` : `Rp ${Number(promotion.amount).toLocaleString("id-ID")}`}</div><div className="flex items-center gap-1.5 text-[10px] text-ink-muted"><CalendarClock className="h-3.5 w-3.5" />{promotion.date_expires ? new Date(promotion.date_expires).toLocaleDateString("id-ID") : "Tanpa batas"}</div>{!expired ? <button type="button" disabled={stoppingId === promotion.id} onClick={() => void stop(promotion)} className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg bg-red-50 px-2.5 text-[10px] font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"><CircleStop className="h-3.5 w-3.5" />{stoppingId === promotion.id ? "Menghentikan..." : "Hentikan"}</button> : <span />}</article>;
        })}
        {!loading && !promotions.length ? <p className="px-5 py-12 text-center text-sm text-ink-muted">Belum ada promo.</p> : null}
      </div>
    </section>
  </div>;
}

const INPUT = "h-10 w-full rounded-xl border border-line bg-slate-50 px-3 text-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-50";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-[11px] font-semibold text-ink"><span>{label}</span>{children}</label>; }

function SelectionPicker({ label, helper, items, selected, onChange, searchPlaceholder }: { label: string; helper: string; items: Array<{ id: number; title: string; meta: string }>; selected: number[]; onChange: (ids: number[]) => void; searchPlaceholder: string }) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const visible = items.filter((item) => !normalized || `${item.title} ${item.meta} ${item.id}`.toLowerCase().includes(normalized));
  return <fieldset className="rounded-xl border border-line bg-slate-50 p-3">
    <legend className="px-1 text-[11px] font-semibold text-ink">{label}</legend>
    <p className="mb-2 text-[10px] leading-4 text-ink-muted">{helper}</p>
    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} className={`${INPUT} bg-white`} />
    {selected.length ? <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-brand-700"><span>{selected.length} dipilih</span><button type="button" onClick={() => onChange([])} className="hover:underline">Hapus semua</button></div> : null}
    <div className="mt-2 max-h-44 space-y-1 overflow-y-auto pr-1">
      {visible.map((item) => {
        const checked = selected.includes(item.id);
        return <label key={item.id} className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 transition ${checked ? "border-brand-200 bg-brand-50" : "border-transparent bg-white hover:border-slate-200"}`}>
          <input type="checkbox" checked={checked} onChange={() => onChange(checked ? selected.filter((id) => id !== item.id) : [...selected, item.id])} className="h-4 w-4 rounded border-line text-brand-700" />
          <span className="min-w-0 flex-1"><strong className="block truncate text-xs text-ink">{item.title}</strong><small className="block truncate text-[10px] text-ink-muted">{item.meta} · ID {item.id}</small></span>
        </label>;
      })}
      {!visible.length ? <p className="py-4 text-center text-[11px] text-ink-muted">Tidak ada data yang cocok.</p> : null}
    </div>
  </fieldset>;
}
