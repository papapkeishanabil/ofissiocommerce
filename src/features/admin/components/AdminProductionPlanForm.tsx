"use client";

import { useMemo, useState, useTransition } from "react";
import { Factory, Save, Send } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { ProductionPlan } from "@/features/quotation/quotation.types";
import type { BiteshipCourierService } from "@/features/shipping-settings/shipping-settings.types";
import { formatIDR } from "@/types/product";

const INPUT = "mt-1 min-h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function AdminProductionPlanForm({ quotationId, grandTotal, initialPlan, courierOptions }: { quotationId: string; grandTotal: number; initialPlan?: ProductionPlan | null; courierOptions: BiteshipCourierService[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState(() => ({
    ppicName: initialPlan?.ppicName ?? "",
    productionNotes: initialPlan?.productionNotes ?? "",
    estimatedStartDate: initialPlan?.estimatedStartDate ?? today,
    materialReadyDate: initialPlan?.materialReadyDate ?? today,
    cuttingStartDate: initialPlan?.cuttingStartDate ?? today,
    sewingStartDate: initialPlan?.sewingStartDate ?? today,
    estimatedCompletionDate: initialPlan?.estimatedCompletionDate ?? today,
    qcPackingDays: String(initialPlan?.qcPackingDays ?? 1),
    estimatedHandoverDate: initialPlan?.estimatedHandoverDate ?? addDays(today, 1),
    depositPercent: String(initialPlan?.depositPercent ?? 50),
    courierCode: initialPlan?.courierCode ?? "",
    courierService: initialPlan?.courierService ?? "",
    courierDurationMinDays: String(initialPlan?.courierDurationMinDays ?? 1),
    courierDurationMaxDays: String(initialPlan?.courierDurationMaxDays ?? 2),
    validUntil: initialPlan?.validUntil ?? addDays(today, 7),
  }));
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pending, startTransition] = useTransition();
  const couriers = useMemo(() => {
    const map = new Map<string, string>();
    courierOptions.forEach((option) => map.set(option.courierCode, option.courierName));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "id"));
  }, [courierOptions]);
  const services = useMemo(() => courierOptions.filter((option) => option.courierCode === form.courierCode), [courierOptions, form.courierCode]);
  const minimumHandover = addDays(form.estimatedCompletionDate, Number(form.qcPackingDays));
  const arrivalStart = addDays(form.estimatedHandoverDate, Number(form.courierDurationMinDays));
  const arrivalEnd = addDays(form.estimatedHandoverDate, Number(form.courierDurationMaxDays));
  const depositAmount = Math.round(grandTotal * Number(form.depositPercent) / 100);

  function set(key: keyof typeof form, value: string) { setForm((current) => ({ ...current, [key]: value })); }
  function setCourier(code: string) { const service = courierOptions.find((item) => item.courierCode === code); setForm((current) => ({ ...current, courierCode: code, courierService: service?.serviceName ?? "" })); }
  function save(publishToCustomer: boolean) {
    setMessage(null); setIsError(false);
    startTransition(async () => {
      const payload = { ...form, productionNotes: form.productionNotes || null, qcPackingDays: Number(form.qcPackingDays), depositPercent: Number(form.depositPercent), courierDurationMinDays: Number(form.courierDurationMinDays), courierDurationMaxDays: Number(form.courierDurationMaxDays), estimatedArrivalStart: arrivalStart, estimatedArrivalEnd: arrivalEnd, publishToCustomer };
      const response = await fetch(`/api/admin/quotations/${quotationId}/production-plan`, { method: "PATCH", headers: { "Content-Type": "application/json", "x-ofissio-internal-role": "super_admin", "x-ofissio-internal-user-id": "internal-dev" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({})) as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) { setIsError(true); setMessage(result.message ?? "Rencana produksi belum dapat disimpan."); return; }
      setMessage(publishToCustomer ? "Rencana produksi dan termin DP dikirim ke customer." : "Draft rencana produksi tersimpan.");
    });
  }

  return <section className="rounded-2xl border border-brand-100 bg-brand-50/40 p-5">
    <div className="flex items-start gap-3"><Factory className="mt-0.5 h-5 w-5 text-brand-700" aria-hidden="true" /><div><h2 className="font-black text-ink">Rencana Produksi & Termin Pembayaran</h2><p className="mt-1 text-sm text-ink-muted">Catat hasil konsultasi PPIC. Produksi dimulai setelah DP diterima; pelunasan dilakukan setelah produksi selesai sebelum pengiriman.</p></div></div>
    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Field label="PIC / PPIC produksi"><input required value={form.ppicName} onChange={(e) => set("ppicName", e.target.value)} className={INPUT} /></Field>
      <Field label="Tanggal mulai"><input type="date" value={form.estimatedStartDate} onChange={(e) => set("estimatedStartDate", e.target.value)} className={INPUT} /></Field>
      <Field label="Bahan siap"><input type="date" min={form.estimatedStartDate} value={form.materialReadyDate} onChange={(e) => set("materialReadyDate", e.target.value)} className={INPUT} /></Field>
      <Field label="Mulai cutting"><input type="date" min={form.materialReadyDate} value={form.cuttingStartDate} onChange={(e) => set("cuttingStartDate", e.target.value)} className={INPUT} /></Field>
      <Field label="Mulai sewing"><input type="date" min={form.cuttingStartDate} value={form.sewingStartDate} onChange={(e) => set("sewingStartDate", e.target.value)} className={INPUT} /></Field>
      <Field label="Estimasi produksi selesai"><input type="date" min={form.sewingStartDate} value={form.estimatedCompletionDate} onChange={(e) => set("estimatedCompletionDate", e.target.value)} className={INPUT} /></Field>
      <Field label="QC & packing (hari)"><input type="number" min="0" max="30" value={form.qcPackingDays} onChange={(e) => set("qcPackingDays", e.target.value)} className={INPUT} /></Field>
      <Field label="Diserahkan ke kurir"><input type="date" min={minimumHandover} value={form.estimatedHandoverDate} onChange={(e) => set("estimatedHandoverDate", e.target.value)} className={INPUT} /><span className="mt-1 block text-xs font-normal text-ink-muted">Minimal {formatDate(minimumHandover)} setelah QC/packing.</span></Field>
      <Field label="DP (%)"><input type="number" min="1" max="100" value={form.depositPercent} onChange={(e) => set("depositPercent", e.target.value)} className={INPUT} /></Field>
      <Field label="Rencana kurir"><select value={form.courierCode} onChange={(e) => setCourier(e.target.value)} className={INPUT}><option value="">Pilih kurir</option>{couriers.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></Field>
      <Field label="Layanan"><select value={form.courierService} onChange={(e) => set("courierService", e.target.value)} className={INPUT}><option value="">Pilih layanan</option>{services.map((service) => <option key={service.key} value={service.serviceName}>{service.serviceName}</option>)}</select></Field>
      <Field label="Durasi kirim minimum"><input type="number" min="0" max="30" value={form.courierDurationMinDays} onChange={(e) => set("courierDurationMinDays", e.target.value)} className={INPUT} /></Field>
      <Field label="Durasi kirim maksimum"><input type="number" min="0" max="60" value={form.courierDurationMaxDays} onChange={(e) => set("courierDurationMaxDays", e.target.value)} className={INPUT} /></Field>
      <Field label="Rencana berlaku sampai"><input type="date" value={form.validUntil} onChange={(e) => set("validUntil", e.target.value)} className={INPUT} /></Field>
      <Field label="Catatan internal PPIC" wide><textarea rows={3} value={form.productionNotes} onChange={(e) => set("productionNotes", e.target.value)} className={INPUT} /></Field>
      <div className="rounded-xl bg-white p-4 ring-1 ring-line"><p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Termin pembayaran</p>{grandTotal > 0 ? <><p className="mt-2 font-black text-brand-800">DP {form.depositPercent}%, {formatIDR(depositAmount)}</p><p className="mt-1 text-xs text-ink-muted">Pelunasan {formatIDR(Math.max(0, grandTotal - depositAmount))} setelah produksi selesai.</p></> : <p className="mt-2 text-sm font-semibold text-ink-muted">Menunggu harga final sebelum nominal DP dihitung.</p>}</div>
      <div className="rounded-xl bg-white p-4 ring-1 ring-line"><p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Estimasi tiba</p>{form.courierCode && form.courierService ? <><p className="mt-2 font-black text-brand-800">{formatDate(arrivalStart)} - {formatDate(arrivalEnd)}</p><p className="mt-1 text-xs text-ink-muted">Rencana {form.courierCode.toUpperCase()}, {form.courierService}</p></> : <p className="mt-2 text-sm font-semibold text-ink-muted">Pilih kurir dan layanan terlebih dahulu.</p>}</div>
    </div>
    {courierOptions.length === 0 ? <p role="alert" className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">Layanan kurir aktif belum dapat dimuat. Periksa konfigurasi penyedia pengiriman.</p> : null}
    <div className="mt-5 flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => save(false)} disabled={pending}><Save className="h-4 w-4" />Simpan draft</Button><Button type="button" onClick={() => save(true)} disabled={pending || !form.ppicName || grandTotal <= 0 || !form.courierCode || !form.courierService}><Send className="h-4 w-4" />Kirim rencana ke customer</Button></div>
    {message ? <p role={isError ? "alert" : "status"} className={`mt-4 rounded-xl px-3 py-2 text-sm font-bold ${isError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{message}</p> : null}
  </section>;
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) { return <label className={`block text-sm font-bold text-ink ${wide ? "md:col-span-2" : ""}`}>{label}{children}</label>; }
function addDays(dateValue: string, days: number) { const date = new Date(`${dateValue}T12:00:00`); date.setDate(date.getDate() + (Number.isFinite(days) ? days : 0)); return date.toISOString().slice(0, 10); }
function formatDate(dateValue: string) { return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${dateValue}T12:00:00`)); }
