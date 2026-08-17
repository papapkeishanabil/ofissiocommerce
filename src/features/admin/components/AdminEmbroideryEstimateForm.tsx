"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarClock, Send, Save } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { EmbroideryConsultationEstimate } from "@/features/quotation/quotation.types";
import type { BiteshipCourierService } from "@/features/shipping-settings/shipping-settings.types";

const INPUT = "mt-1 min-h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function AdminEmbroideryEstimateForm({ quotationId, initialEstimate, courierOptions }: { quotationId: string; initialEstimate?: EmbroideryConsultationEstimate | null; courierOptions: BiteshipCourierService[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState(() => {
    const estimatedCompletionDate = initialEstimate?.estimatedCompletionDate ?? today;
    const qcPackingDays = initialEstimate?.qcPackingDays ?? 0;
    const minimumHandover = addDays(estimatedCompletionDate, qcPackingDays);
    const savedHandover = initialEstimate?.estimatedHandoverDate ?? minimumHandover;
    return {
      complexity: initialEstimate?.complexity ?? "medium",
      estimatedStitchCount: initialEstimate?.estimatedStitchCount == null ? "" : String(initialEstimate.estimatedStitchCount),
      supervisorName: initialEstimate?.supervisorName ?? "",
      supervisorNotes: initialEstimate?.supervisorNotes ?? "",
      estimatedStartDate: initialEstimate?.estimatedStartDate ?? today,
      estimatedCompletionDate,
      qcPackingDays: String(qcPackingDays),
      estimatedHandoverDate: savedHandover < minimumHandover ? minimumHandover : savedHandover,
      courierCode: initialEstimate?.courierCode ?? "",
      courierService: initialEstimate?.courierService ?? "",
      courierDurationMinDays: String(initialEstimate?.courierDurationMinDays ?? 1),
      courierDurationMaxDays: String(initialEstimate?.courierDurationMaxDays ?? 2),
      validUntil: initialEstimate?.validUntil ?? today,
    };
  });
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pending, startTransition] = useTransition();
  const courierGroups = useMemo(() => {
    const groups = new Map<string, string>();
    for (const option of courierOptions) groups.set(option.courierCode, option.courierName);
    return [...groups.entries()].sort((a, b) => a[1].localeCompare(b[1], "id"));
  }, [courierOptions]);
  const availableServices = useMemo(
    () => courierOptions.filter((option) => option.courierCode === form.courierCode),
    [courierOptions, form.courierCode],
  );
  const minimumHandoverDate = addDays(form.estimatedCompletionDate, Number(form.qcPackingDays));
  const arrivalStart = addDays(form.estimatedHandoverDate, Number(form.courierDurationMinDays));
  const arrivalEnd = addDays(form.estimatedHandoverDate, Number(form.courierDurationMaxDays));

  function set(key: keyof typeof form, value: string) { setForm((current) => ({ ...current, [key]: value })); }
  function setCompletionDate(value: string) {
    setForm((current) => {
      const minimum = addDays(value, Number(current.qcPackingDays));
      return { ...current, estimatedCompletionDate: value, estimatedHandoverDate: current.estimatedHandoverDate < minimum ? minimum : current.estimatedHandoverDate };
    });
  }
  function setQcPackingDays(value: string) {
    setForm((current) => {
      const minimum = addDays(current.estimatedCompletionDate, Number(value));
      return { ...current, qcPackingDays: value, estimatedHandoverDate: current.estimatedHandoverDate < minimum ? minimum : current.estimatedHandoverDate };
    });
  }
  function setCourier(code: string) {
    const firstService = courierOptions.find((option) => option.courierCode === code);
    setForm((current) => ({ ...current, courierCode: code, courierService: firstService?.serviceName ?? "" }));
  }
  function save(publishToCustomer: boolean) {
    setMessage(null); setIsError(false);
    startTransition(async () => {
      const response = await fetch(`/api/admin/quotations/${quotationId}/embroidery-estimate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-ofissio-internal-role": "super_admin", "x-ofissio-internal-user-id": "internal-dev" },
        body: JSON.stringify({
          ...form,
          estimatedStitchCount: form.estimatedStitchCount ? Number(form.estimatedStitchCount) : null,
          qcPackingDays: Number(form.qcPackingDays),
          courierDurationMinDays: Number(form.courierDurationMinDays),
          courierDurationMaxDays: Number(form.courierDurationMaxDays),
          estimatedArrivalStart: arrivalStart,
          estimatedArrivalEnd: arrivalEnd,
          supervisorNotes: form.supervisorNotes || null,
          publishToCustomer,
        }),
      });
      const result = await response.json().catch(() => ({})) as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) { setIsError(true); setMessage(result.message ?? "Estimasi belum dapat disimpan."); return; }
      setMessage(publishToCustomer ? "Estimasi sudah tersedia untuk customer." : "Draft estimasi tersimpan.");
    });
  }

  return <section className="rounded-2xl border border-brand-100 bg-brand-50/40 p-5">
    <div className="flex items-start gap-3"><CalendarClock className="mt-0.5 h-5 w-5 text-brand-700" aria-hidden="true" /><div><h2 className="font-black text-ink">Estimasi Pengerjaan Bordir</h2><p className="mt-1 text-sm text-ink-muted">Catat hasil konsultasi langsung dengan supervisor. Tanggal tiba dihitung dari tanggal serah ke kurir.</p></div></div>
    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Field label="Supervisor bordir"><input required value={form.supervisorName} onChange={(e) => set("supervisorName", e.target.value)} className={INPUT} /></Field>
      <Field label="Tingkat kesulitan"><select value={form.complexity} onChange={(e) => set("complexity", e.target.value)} className={INPUT}><option value="easy">Mudah</option><option value="medium">Sedang</option><option value="hard">Sulit</option></select></Field>
      <Field label="Estimasi jumlah titik"><input type="number" min="0" value={form.estimatedStitchCount} onChange={(e) => set("estimatedStitchCount", e.target.value)} className={INPUT} /></Field>
      <Field label="Tanggal mulai"><input type="date" value={form.estimatedStartDate} onChange={(e) => set("estimatedStartDate", e.target.value)} className={INPUT} /></Field>
      <Field label="Estimasi selesai"><input type="date" min={form.estimatedStartDate} value={form.estimatedCompletionDate} onChange={(e) => setCompletionDate(e.target.value)} className={INPUT} /></Field>
      <Field label="QC & packing (hari)"><input type="number" min="0" max="30" value={form.qcPackingDays} onChange={(e) => setQcPackingDays(e.target.value)} className={INPUT} /></Field>
      <Field label="Diserahkan ke kurir"><input type="date" min={minimumHandoverDate} value={form.estimatedHandoverDate} onChange={(e) => set("estimatedHandoverDate", e.target.value)} className={INPUT} /><span className="mt-1 block text-xs font-normal text-ink-muted">Paling cepat {formatDate(minimumHandoverDate)}, setelah selesai dan QC/packing.</span></Field>
      <Field label="Kurir pengiriman"><select value={form.courierCode} onChange={(e) => setCourier(e.target.value)} className={INPUT} disabled={courierGroups.length === 0}><option value="">Pilih kurir</option>{courierGroups.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></Field>
      <Field label="Layanan kurir"><select value={form.courierService} onChange={(e) => set("courierService", e.target.value)} className={INPUT} disabled={availableServices.length === 0}><option value="">Pilih layanan</option>{availableServices.map((service) => <option key={service.key} value={service.serviceName}>{service.serviceName}{service.description ? ` — ${service.description}` : ""}</option>)}</select></Field>
      <Field label="Durasi minimum (hari)"><input type="number" min="0" max="30" value={form.courierDurationMinDays} onChange={(e) => set("courierDurationMinDays", e.target.value)} className={INPUT} /></Field>
      <Field label="Durasi maksimum (hari)"><input type="number" min="0" max="60" value={form.courierDurationMaxDays} onChange={(e) => set("courierDurationMaxDays", e.target.value)} className={INPUT} /></Field>
      <Field label="Estimasi berlaku sampai"><input type="date" value={form.validUntil} onChange={(e) => set("validUntil", e.target.value)} className={INPUT} /></Field>
      <Field label="Catatan supervisor" wide><textarea rows={3} value={form.supervisorNotes} onChange={(e) => set("supervisorNotes", e.target.value)} className={INPUT} /></Field>
      <div className="rounded-xl bg-white p-4 ring-1 ring-line md:col-span-2 xl:col-span-1"><p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Estimasi tiba</p>{form.courierCode && form.courierService ? <><p className="mt-2 font-black text-brand-800">{formatDate(arrivalStart)} – {formatDate(arrivalEnd)}</p><p className="mt-1 text-xs text-ink-muted">{form.courierCode.toUpperCase()} · {form.courierService}</p></> : <p className="mt-2 text-sm font-semibold text-ink-muted">Pilih kurir dan layanan terlebih dahulu.</p>}</div>
    </div>
    {courierOptions.length === 0 ? <p role="alert" className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">Belum ada layanan kurir aktif yang dapat dimuat. Periksa Admin → Pengaturan → Kurir Checkout dan koneksi penyedia pengiriman.</p> : null}
    <div className="mt-5 flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => save(false)} disabled={pending} aria-busy={pending}><Save className="h-4 w-4" aria-hidden="true" />Simpan draft</Button><Button type="button" onClick={() => save(true)} disabled={pending || !form.supervisorName || !form.courierCode || !form.courierService} aria-busy={pending}><Send className="h-4 w-4" aria-hidden="true" />Kirim ke customer</Button></div>
    {message ? <p role={isError ? "alert" : "status"} className={`mt-4 rounded-xl px-3 py-2 text-sm font-bold ${isError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{message}</p> : null}
  </section>;
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) { return <label className={`block text-sm font-bold text-ink ${wide ? "md:col-span-2" : ""}`}>{label}{children}</label>; }
function addDays(date: string, days: number) { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + (Number.isFinite(days) ? days : 0)); return value.toISOString().slice(0, 10); }
function formatDate(date: string) { return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`)); }
