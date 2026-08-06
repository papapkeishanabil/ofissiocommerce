"use client";

import { useId, useState, type FormEvent } from "react";
import {
  Boxes,
  CircleAlert,
  Link2,
  PackageSearch,
  RefreshCw,
  ShieldCheck,
  Webhook,
} from "lucide-react";

import { AdminSectionCard } from "@/features/admin/components/AdminSectionCard";

import type {
  GineeInventory,
  GineeOrder,
  GineeProductMapping,
  GineeWebhookEvent,
} from "../ginee.types";

type Health = {
  enabled: boolean;
  configured: boolean;
  mode: string;
  providerMode: string;
  testLive: boolean;
  connectionOk: boolean;
  shopCount: number;
  configErrors: string[];
  destructiveSyncEnabled: false;
} | null;

type Props = {
  initialHealth: Health;
  initialOrders: GineeOrder[];
  initialMappings: GineeProductMapping[];
  initialEvents: GineeWebhookEvent[];
  canReadSync: boolean;
  canUpdate: boolean;
};

export function GineeIntegrationPanel(props: Props) {
  const [health, setHealth] = useState(props.initialHealth);
  const [orders, setOrders] = useState(props.initialOrders);
  const [mappings, setMappings] = useState(props.initialMappings);
  const [events, setEvents] = useState(props.initialEvents);
  const [inventory, setInventory] = useState<GineeInventory[]>([]);
  const [sku, setSku] = useState("KK-006-S");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const mappedGineeSkus = new Set(mappings.map((item) => item.gineeSku));
  const unmappedGineeSkus = [...new Set(
    orders.flatMap((order) => order.items.map((item) => item.stockSku)),
  )].filter((item) => !mappedGineeSkus.has(item));
  const unlinkedWooSkus = mappings
    .filter((item) => !item.woocommerceProductId)
    .map((item) => item.stockSku);

  async function refreshHealth() {
    await run("health", async () => {
      const data = await requestJson<{ health: NonNullable<Health> }>("/api/admin/integrations/ginee/health");
      setHealth(data.health);
    });
  }

  async function refreshOrders() {
    await run("orders", async () => {
      const data = await requestJson<{ orders: GineeOrder[] }>("/api/admin/integrations/ginee/orders");
      setOrders(data.orders);
    });
  }

  async function findInventory(event: FormEvent) {
    event.preventDefault();
    await run("inventory", async () => {
      const data = await requestJson<{ inventory: GineeInventory[] }>(
        `/api/admin/integrations/ginee/inventory?sku=${encodeURIComponent(sku)}`,
      );
      setInventory(data.inventory);
    });
  }

  async function saveMapping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await run("mapping", async () => {
      const response = await requestJson<{ mapping: GineeProductMapping }>(
        "/api/admin/integrations/ginee/mappings",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parentSku: data.get("parentSku"),
            stockSku: data.get("stockSku"),
            gineeSku: data.get("gineeSku"),
            sizeLabel: data.get("sizeLabel") || null,
            gineeWarehouseId: data.get("gineeWarehouseId") || null,
          }),
        },
      );
      setMappings((current) => [
        response.mapping,
        ...current.filter((item) => item.id !== response.mapping.id),
      ]);
      event.currentTarget.reset();
    });
  }

  async function refreshEvents() {
    await run("events", async () => {
      const data = await requestJson<{ events: GineeWebhookEvent[] }>("/api/admin/integrations/ginee/webhooks");
      setEvents(data.events);
    });
  }

  async function run(key: string, work: () => Promise<void>) {
    setBusy(key);
    setMessage(null);
    try {
      await work();
      setMessage("Data read-only berhasil diperbarui.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Permintaan Ginee belum dapat diproses.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-line bg-white shadow-soft-sm">
        <div className="grid gap-5 bg-gradient-to-br from-brand-950 via-brand-900 to-blue-800 px-6 py-7 text-white lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-200">Omnichannel integration</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">Ginee read-only control</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
              Pantau order, shop, inventory, dan mapping SKU tanpa izin membuat atau mengubah data di Ginee.
            </p>
          </div>
          <StatusPill ok={Boolean(health?.connectionOk)}>
            {health?.providerMode === "live_read_only" ? "LIVE READ-ONLY" : "MOCK READ-ONLY"}
          </StatusPill>
        </div>
      </section>

      {message ? (
        <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
          {message}
        </div>
      ) : null}

      <AdminSectionCard
        icon={ShieldCheck}
        eyebrow="Connection safety"
        title="Status koneksi"
        description="Credential disimpan server-side. Tombol write, fulfillment, shipment, dan inventory mutation sengaja tidak tersedia."
        actions={<ActionButton busy={busy === "health"} onClick={refreshHealth}>Cek ulang</ActionButton>}
      >
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Enabled" value={health?.enabled ? "Ya" : "Tidak"} />
          <Metric label="Configured" value={health?.configured ? "Ya" : "Tidak"} />
          <Metric label="Mode" value={health?.mode ?? "sandbox"} />
          <Metric label="Shop terbaca" value={String(health?.shopCount ?? 0)} />
          <Metric label="Write sync" value="Selalu nonaktif" />
        </dl>
        {(health?.configErrors.length ?? 0) > 0 ? (
          <div className="mt-4 space-y-2">
            {health?.configErrors.map((error) => (
              <p key={error} className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
              </p>
            ))}
          </div>
        ) : null}
      </AdminSectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSectionCard
          icon={PackageSearch}
          title="Order terbaru Ginee"
          description="Snapshot hanya menyimpan data operasional yang sudah disanitasi."
          actions={props.canReadSync ? <ActionButton busy={busy === "orders"} onClick={refreshOrders}>Tarik data</ActionButton> : undefined}
        >
          <div className="space-y-3">
            {orders.length ? orders.map((order) => (
              <article key={order.gineeOrderId} className="rounded-xl border border-line bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm text-ink">{order.channelOrderId ?? order.gineeOrderId}</strong>
                  <StatusPill ok={order.status !== "manual_review"}>{order.status}</StatusPill>
                </div>
                <p className="mt-2 text-xs text-ink-muted">{order.channel} · {order.items.length} item · {formatMoney(order.totalAmount)}</p>
              </article>
            )) : <EmptyState label="Belum ada order yang ditarik." />}
          </div>
        </AdminSectionCard>

        <AdminSectionCard icon={Boxes} title="Cek inventory per Stock SKU" description="SKU variasi wajib unik, misalnya KK-006-S, KK-006-M, dan KK-006-L.">
          {props.canReadSync ? (
            <form onSubmit={findInventory} className="flex flex-col gap-3 sm:flex-row">
              <label className="min-w-0 flex-1 text-sm font-bold text-ink">
                Stock SKU
                <input value={sku} onChange={(event) => setSku(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-line px-3 font-medium uppercase outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
              </label>
              <button aria-busy={busy === "inventory"} disabled={busy === "inventory"} className="min-h-11 self-end rounded-xl bg-brand-800 px-5 text-sm font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-60">Cek stok</button>
            </form>
          ) : <EmptyState label="Role ini tidak memiliki izin sync read." />}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {inventory.map((item) => (
              <Metric key={`${item.stockSku}-${item.warehouseId}`} label={`${item.stockSku} · ${item.warehouseName ?? "Warehouse"}`} value={`${item.availableStock} tersedia`} />
            ))}
          </div>
        </AdminSectionCard>
      </div>

      <AdminSectionCard icon={Link2} title="Mapping SKU" description="Hubungkan parent SKU dan SKU variasi WooCommerce/Ofissio ke SKU Ginee. Mapping tidak mengaktifkan stock push atau order write.">
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <CoverageCard
            label="SKU Ginee belum mapped"
            values={unmappedGineeSkus}
            empty="Semua SKU dari order yang ditarik sudah mapped."
          />
          <CoverageCard
            label="Mapping belum punya Woo Product ID"
            values={unlinkedWooSkus}
            empty="Semua mapping sudah terhubung ke WooCommerce."
          />
        </div>
        {props.canUpdate ? (
          <form onSubmit={saveMapping} className="grid gap-3 rounded-2xl border border-line bg-slate-50 p-4 md:grid-cols-5">
            <Field name="parentSku" label="Parent SKU" placeholder="KK-006" required />
            <Field name="stockSku" label="Stock SKU" placeholder="KK-006-S" required />
            <Field name="gineeSku" label="Ginee SKU" placeholder="KK-006-S" required />
            <Field name="sizeLabel" label="Ukuran" placeholder="S" />
            <Field name="gineeWarehouseId" label="Warehouse ID" placeholder="Opsional" />
            <button aria-busy={busy === "mapping"} disabled={busy === "mapping"} className="min-h-11 rounded-xl bg-brand-800 px-5 text-sm font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-60 md:col-span-5 md:justify-self-start">Simpan mapping</button>
          </form>
        ) : (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-ink-muted">Role Anda hanya dapat melihat mapping.</p>
        )}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-ink-subtle"><tr><th className="px-3 py-3">Parent</th><th className="px-3 py-3">Stock SKU</th><th className="px-3 py-3">Ginee SKU</th><th className="px-3 py-3">Ukuran</th><th className="px-3 py-3">Write sync</th></tr></thead>
            <tbody className="divide-y divide-line">
              {mappings.map((mapping) => <tr key={mapping.id}><td className="px-3 py-3 font-bold">{mapping.parentSku}</td><td className="px-3 py-3">{mapping.stockSku}</td><td className="px-3 py-3">{mapping.gineeSku}</td><td className="px-3 py-3">{mapping.sizeLabel ?? "-"}</td><td className="px-3 py-3 text-emerald-700">Nonaktif</td></tr>)}
            </tbody>
          </table>
          {!mappings.length ? <EmptyState label="Belum ada mapping. Terapkan migration 021 sebelum menyimpan ke Supabase." /> : null}
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        icon={Webhook}
        title="Webhook events"
        description="Webhook hanya merekam event aman dan menandai order untuk read/refetch. Payload customer tidak disimpan."
        actions={<ActionButton busy={busy === "events"} onClick={refreshEvents}>Refresh</ActionButton>}
      >
        <div className="space-y-2">
          {events.map((event) => <div key={event.id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-line px-4 py-3 text-sm"><span className="font-bold text-ink">{event.eventType}</span><span className="text-ink-muted">{event.status} · {formatDate(event.createdAt)}</span></div>)}
          {!events.length ? <EmptyState label="Belum ada webhook event." /> : null}
        </div>
      </AdminSectionCard>
    </div>
  );
}

function Field(props: { name: string; label: string; placeholder: string; required?: boolean }) {
  const id = useId();
  return (
    <label htmlFor={id} className="text-sm font-bold text-ink">
      {props.label}{props.required ? <span aria-hidden="true" className="text-red-600"> *</span> : null}
      <input id={id} name={props.name} placeholder={props.placeholder} required={props.required} aria-required={props.required} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3 font-medium outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
    </label>
  );
}

function ActionButton({ busy, onClick, children }: { busy: boolean; onClick: () => void; children: string }) {
  return <button type="button" aria-busy={busy} disabled={busy} onClick={onClick} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-bold text-brand-800 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} aria-hidden="true" />{children}</button>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-line bg-slate-50 p-4"><dt className="text-[11px] font-bold uppercase tracking-wide text-ink-subtle">{label}</dt><dd className="mt-2 break-words text-base font-extrabold capitalize text-ink">{value}</dd></div>;
}

function StatusPill({ ok, children }: { ok: boolean; children: string }) {
  return <span className={`inline-flex w-fit rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide ring-1 ring-inset ${ok ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-800 ring-amber-200"}`}>{children}</span>;
}

function EmptyState({ label }: { label: string }) {
  return <p className="rounded-xl border border-dashed border-line bg-slate-50 px-4 py-5 text-center text-sm text-ink-muted">{label}</p>;
}

function CoverageCard({ label, values, empty }: { label: string; values: string[]; empty: string }) {
  return (
    <div className="rounded-xl border border-line bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-subtle">{label}</p>
      <p className={`mt-2 text-sm font-semibold ${values.length ? "text-amber-800" : "text-emerald-700"}`}>
        {values.length ? values.join(", ") : empty}
      </p>
    </div>
  );
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const body = await response.json().catch(() => ({})) as { message?: string } & T;
  if (!response.ok) throw new Error(body.message || "Permintaan Ginee gagal.");
  return body;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
