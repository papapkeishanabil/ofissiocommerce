"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Save, ShieldAlert, Truck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { BiteshipCourierService, ShippingSettingsState } from "../shipping-settings.types";

export function AdminShippingSettingsForm({ initialSettings, catalog, canUpdate }: { initialSettings: ShippingSettingsState; catalog: BiteshipCourierService[]; canUpdate: boolean }) {
  const [selected, setSelected] = useState(() => new Set(initialSettings.enabledServices));
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();
  const groups = useMemo(() => {
    const result = new Map<string, { name: string; services: BiteshipCourierService[] }>();
    for (const service of catalog) {
      const group = result.get(service.courierCode) ?? { name: service.courierName, services: [] };
      group.services.push(service);
      result.set(service.courierCode, group);
    }
    return [...result.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name, "id"));
  }, [catalog]);

  function toggle(key: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleGroup(keys: string[], enabled: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      for (const key of keys) enabled ? next.add(key) : next.delete(key);
      return next;
    });
  }

  function save() {
    setMessage(null);
    setIsError(false);
    startTransition(async () => {
      const response = await fetch("/api/admin/settings/shipping", { method: "PATCH", headers: { "Content-Type": "application/json", "x-ofissio-internal-role": "super_admin", "x-ofissio-internal-user-id": "internal-dev" }, body: JSON.stringify({ enabledServices: [...selected] }) });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) {
        setIsError(true);
        setMessage(result.message ?? "Pengaturan kurir belum dapat disimpan.");
        return;
      }
      setMessage(`${selected.size} layanan kurir aktif untuk checkout.`);
    });
  }

  return <section className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md md:p-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-brand-50 px-3 text-xs font-black uppercase tracking-[0.14em] text-brand-700"><Truck className="h-4 w-4" /> Biteship</span>
          <span className={`inline-flex min-h-8 items-center gap-2 rounded-full px-3 text-xs font-black uppercase tracking-[0.14em] ${initialSettings.schemaReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
            {initialSettings.schemaReady ? <CheckCircle2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}{initialSettings.source}
          </span>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-muted">Centang layanan yang boleh dilihat customer. Ketersediaan rute dan tarif akhirnya tetap ditentukan Biteship saat cek ongkir.</p>
      </div>
      {canUpdate ? <Button type="button" onClick={save} disabled={isPending || !initialSettings.schemaReady} aria-busy={isPending}><Save className="h-4 w-4" aria-hidden="true" />{isPending ? "Menyimpan..." : "Simpan pengaturan"}</Button> : null}
    </div>
    {!initialSettings.schemaReady ? <div role="alert" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">Jalankan migration 027 agar pilihan kurir dapat disimpan. Selama belum aktif, checkout memakai BITESHIP_COURIERS.</div> : null}
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {groups.map(([code, group]) => {
        const keys = group.services.map((service) => service.key);
        const activeCount = keys.filter((key) => selected.has(key)).length;
        return <fieldset key={code} disabled={!canUpdate || isPending || !initialSettings.schemaReady} className="rounded-2xl border border-line bg-slate-50 p-4">
          <legend className="sr-only">{group.name}</legend>
          <label className="flex cursor-pointer items-center justify-between gap-3 border-b border-line pb-3">
            <span><span className="block font-black text-ink">{group.name}</span><span className="text-xs font-semibold text-ink-muted">{activeCount}/{keys.length} aktif</span></span>
            <input type="checkbox" checked={activeCount === keys.length && keys.length > 0} ref={(node) => { if (node) node.indeterminate = activeCount > 0 && activeCount < keys.length; }} onChange={(event) => toggleGroup(keys, event.target.checked)} className="h-5 w-5 accent-brand-700" />
          </label>
          <div className="mt-3 space-y-2">{group.services.map((service) => <label key={service.key} className="flex cursor-pointer items-start gap-3 rounded-xl bg-white p-3 text-sm">
            <input type="checkbox" checked={selected.has(service.key)} onChange={() => toggle(service.key)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-700" />
            <span><span className="block font-bold text-ink">{service.serviceName}</span><span className="mt-0.5 block text-xs text-ink-muted">{service.description || service.serviceCode}</span></span>
          </label>)}</div>
        </fieldset>;
      })}
    </div>
    {message ? <p role={isError ? "alert" : "status"} className={`mt-5 rounded-xl px-4 py-3 text-sm font-bold ${isError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{message}</p> : null}
  </section>;
}
