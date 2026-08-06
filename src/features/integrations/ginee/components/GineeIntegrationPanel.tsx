"use client";

import { useId, useState, type FormEvent } from "react";
import {
  Boxes,
  CircleAlert,
  CircleCheckBig,
  Link2,
  PackageSearch,
  RefreshCw,
  ShieldCheck,
  Warehouse,
} from "lucide-react";

import { AdminSectionCard } from "@/features/admin/components/AdminSectionCard";

import type {
  GineeInventory,
  GineeInventorySnapshot,
  GineeProductMapping,
} from "../ginee.types";

type Health = {
  enabled: boolean;
  configured: boolean;
  mode: string;
  providerMode: string;
  testLive: boolean;
  connectionOk: boolean;
  configErrors: string[];
  capability: "inventory_read_only";
  orderImportEnabled: false;
  stockWriteEnabled: false;
  checkedAt: string;
} | null;

type StockCheckResult = {
  stockSku: string;
  gineeSku: string;
  mapped: boolean;
  mapping: GineeProductMapping | null;
  inventory: GineeInventory[];
  lastStock: number;
  lastCheckedAt: string;
  unmappedSkus: string[];
};

type Props = {
  initialHealth: Health;
  initialMappings: GineeProductMapping[];
  initialSnapshots: GineeInventorySnapshot[];
  initialUnmappedSkus: string[];
  canReadStock: boolean;
  canUpdate: boolean;
};

export function GineeIntegrationPanel(props: Props) {
  const skuInputId = useId();
  const [health, setHealth] = useState(props.initialHealth);
  const [mappings, setMappings] = useState(props.initialMappings);
  const [snapshots, setSnapshots] = useState(props.initialSnapshots);
  const [unmappedSkus, setUnmappedSkus] = useState(props.initialUnmappedSkus);
  const [result, setResult] = useState<StockCheckResult | null>(null);
  const [sku, setSku] = useState("KK-006-M");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function refreshHealth() {
    await run("health", async () => {
      const data = await requestJson<{ health: NonNullable<Health> }>("/api/admin/integrations/ginee/health");
      setHealth(data.health);
    }, "Status koneksi berhasil diperbarui.");
  }

  async function checkStock(event: FormEvent) {
    event.preventDefault();
    await run("stock", async () => {
      const data = await requestJson<{ result: StockCheckResult }>(
        "/api/admin/integrations/ginee/check-stock",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sku }),
        },
      );
      setResult(data.result);
      if (data.result.mapping) {
        setMappings((current) => current.map((item) =>
          item.id === data.result.mapping?.id ? data.result.mapping : item,
        ).filter((item): item is GineeProductMapping => Boolean(item)));
      }
      setUnmappedSkus((current) => data.result.mapped
        ? current.filter((item) => item !== data.result.stockSku)
        : [...new Set([data.result.stockSku, ...current])]);
      setSnapshots((current) => [
        ...data.result.inventory.map((item) => ({
          id: `local-${data.result.lastCheckedAt}-${item.warehouseId ?? "all"}`,
          mappingId: data.result.mapping?.id ?? null,
          stockSku: data.result.stockSku,
          gineeSku: data.result.gineeSku,
          gineeWarehouseId: item.warehouseId,
          warehouseName: item.warehouseName,
          warehouseStock: item.warehouseStock,
          availableStock: item.availableStock,
          reservedStock: item.reservedStock,
          lockedStock: item.lockedStock,
          checkedAt: data.result.lastCheckedAt,
          createdAt: data.result.lastCheckedAt,
        })),
        ...current,
      ].slice(0, 20));
    }, "Stok Ginee berhasil diperiksa.");
  }

  async function saveMapping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    await run("mapping", async () => {
      const response = await requestJson<{ mapping: GineeProductMapping }>(
        "/api/admin/integrations/ginee/mappings",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parentSku: data.get("parentSku"),
            stockSku: data.get("stockSku"),
            sizeLabel: data.get("sizeLabel") || null,
            colorLabel: data.get("colorLabel") || null,
            woocommerceProductId: data.get("woocommerceProductId") || null,
            woocommerceVariationId: data.get("woocommerceVariationId") || null,
            gineeSku: data.get("gineeSku"),
            gineeWarehouseId: data.get("gineeWarehouseId") || null,
          }),
        },
      );
      setMappings((current) => [
        response.mapping,
        ...current.filter((item) =>
          item.id !== response.mapping.id && item.stockSku !== response.mapping.stockSku,
        ),
      ]);
      setUnmappedSkus((current) => current.filter((item) => item !== response.mapping.stockSku));
      form.reset();
    }, "Mapping SKU berhasil disimpan.");
  }

  async function run(key: string, work: () => Promise<void>, successMessage: string) {
    setBusy(key);
    setMessage(null);
    try {
      await work();
      setMessage({ tone: "success", text: successMessage });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Permintaan Ginee belum dapat diproses.",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-line bg-white shadow-soft-sm">
        <div className="grid gap-6 bg-gradient-to-br from-brand-950 via-brand-900 to-blue-800 px-6 py-8 text-white lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-200">Inventory integration</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">Ginee stock checker</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
              Periksa stok marketplace per SKU ukuran dan warehouse. Ofissio tidak mengimpor order,
              tidak mengubah stok Ginee, dan tidak menjalankan sinkronisasi dua arah.
            </p>
          </div>
          <StatusPill ok={Boolean(health?.connectionOk)}>
            {health?.providerMode === "live_inventory_read_only" ? "LIVE · INVENTORY ONLY" : "MOCK · INVENTORY ONLY"}
          </StatusPill>
        </div>
      </section>

      {message ? (
        <div
          role={message.tone === "error" ? "alert" : "status"}
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            message.tone === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <AdminSectionCard
        icon={ShieldCheck}
        eyebrow="Connection safety"
        title="Status koneksi inventory"
        description="Credential hanya digunakan di server. Kapabilitas client dibatasi ke endpoint baca inventory Ginee."
        actions={<ActionButton busy={busy === "health"} onClick={refreshHealth}>Cek koneksi</ActionButton>}
      >
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Provider" value={health?.providerMode.startsWith("live") ? "Live" : "Mock"} />
          <Metric label="Mode" value={health?.mode ?? "sandbox"} />
          <Metric label="Configured" value={health?.configured ? "Ya" : "Belum"} />
          <Metric label="Order import" value="Nonaktif" />
          <Metric label="Stock write" value="Nonaktif" />
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <AdminSectionCard
          icon={PackageSearch}
          eyebrow="Read-only query"
          title="Cek stok berdasarkan Stock SKU"
          description="Gunakan kode model + ukuran, misalnya KK-006-S, KK-006-M, atau KK-006-L."
        >
          {props.canReadStock ? (
            <form onSubmit={checkStock} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label htmlFor={skuInputId} className="min-w-0 flex-1 text-sm font-bold text-ink">
                Stock SKU
                <span className="mt-1 block text-xs font-normal text-ink-muted">Nama produk tidak digunakan sebagai matching key.</span>
                <input
                  id={skuInputId}
                  value={sku}
                  onChange={(event) => setSku(event.target.value.toUpperCase())}
                  required
                  autoComplete="off"
                  className="mt-2 min-h-11 w-full rounded-xl border border-line px-3 font-semibold uppercase outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </label>
              <button
                aria-busy={busy === "stock"}
                disabled={busy === "stock"}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-800 px-5 text-sm font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-60"
              >
                <PackageSearch className="h-4 w-4" aria-hidden="true" />
                {busy === "stock" ? "Memeriksa…" : "Cek stok"}
              </button>
            </form>
          ) : <EmptyState label="Role ini tidak memiliki izin untuk memeriksa stok." />}

          {result ? (
            <div className="mt-5" aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-slate-50 p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-subtle">Hasil pengecekan</p>
                  <p className="mt-1 text-lg font-extrabold text-ink">{result.stockSku}</p>
                  <p className="text-sm text-ink-muted">Ginee SKU: {result.gineeSku}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-extrabold text-brand-900">{result.lastStock}</p>
                  <p className="text-xs text-ink-muted">total tersedia</p>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {result.inventory.map((item) => (
                  <WarehouseStock key={`${item.stockSku}-${item.warehouseId ?? "all"}`} item={item} />
                ))}
              </div>
              {!result.inventory.length ? <EmptyState label="SKU ditemukan tanpa data stok warehouse, atau SKU belum tersedia di Ginee." /> : null}
              <p className="mt-3 text-xs text-ink-muted">Terakhir dicek {formatDate(result.lastCheckedAt)}</p>
            </div>
          ) : null}
        </AdminSectionCard>

        <AdminSectionCard
          icon={CircleAlert}
          eyebrow="Mapping report"
          title="SKU belum dipetakan"
          description="SKU ini pernah diperiksa tetapi belum memiliki mapping teknis Ofissio–Ginee."
        >
          {unmappedSkus.length ? (
            <ul className="space-y-2">
              {unmappedSkus.map((item) => (
                <li key={item} className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <span className="font-bold text-amber-950">{item}</span>
                  <span className="text-xs font-bold uppercase tracking-wide text-amber-700">Unmapped</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <CircleCheckBig className="h-5 w-5 shrink-0" aria-hidden="true" />
              Belum ada SKU hasil pengecekan yang membutuhkan mapping.
            </div>
          )}
        </AdminSectionCard>
      </div>

      <AdminSectionCard
        icon={Link2}
        eyebrow="Technical mapping"
        title="Mapping SKU per ukuran"
        description="Parent SKU adalah kode model; Stock SKU wajib menyertakan ukuran. WooCommerce dan Ginee ID hanya referensi teknis."
      >
        {props.canUpdate ? (
          <form onSubmit={saveMapping} className="grid gap-3 rounded-2xl border border-line bg-slate-50 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field name="parentSku" label="Parent SKU" placeholder="KK-006" required />
            <Field name="stockSku" label="Stock SKU" placeholder="KK-006-M" required />
            <Field name="sizeLabel" label="Ukuran" placeholder="M" />
            <Field name="colorLabel" label="Warna (opsional)" placeholder="Kosong jika tidak ada" />
            <Field name="woocommerceProductId" label="Woo Product ID" placeholder="Opsional" />
            <Field name="woocommerceVariationId" label="Woo Variation ID" placeholder="Opsional" />
            <Field name="gineeSku" label="Ginee SKU" placeholder="KK-006-M" required />
            <Field name="gineeWarehouseId" label="Warehouse ID" placeholder="Opsional" />
            <button
              aria-busy={busy === "mapping"}
              disabled={busy === "mapping"}
              className="min-h-11 rounded-xl bg-brand-800 px-5 text-sm font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-60 sm:col-span-2 xl:col-span-4 xl:justify-self-start"
            >
              {busy === "mapping" ? "Menyimpan…" : "Simpan mapping SKU"}
            </button>
          </form>
        ) : (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-ink-muted">Role Anda hanya dapat melihat mapping.</p>
        )}

        <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-ink-subtle">
              <tr>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Stock SKU</th>
                <th className="px-4 py-3">Ukuran</th>
                <th className="px-4 py-3">Ginee SKU</th>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3 text-right">Stok terakhir</th>
                <th className="px-4 py-3">Terakhir dicek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {mappings.map((mapping) => (
                <tr key={mapping.id}>
                  <td className="px-4 py-3 font-bold text-ink">{mapping.parentSku}</td>
                  <td className="px-4 py-3 font-semibold text-brand-800">{mapping.stockSku}</td>
                  <td className="px-4 py-3">{mapping.sizeLabel ?? "-"}</td>
                  <td className="px-4 py-3">{mapping.gineeSku}</td>
                  <td className="px-4 py-3">{mapping.gineeWarehouseId ?? "Semua"}</td>
                  <td className="px-4 py-3 text-right font-bold">{mapping.lastStock ?? "-"}</td>
                  <td className="px-4 py-3 text-ink-muted">{mapping.lastCheckedAt ? formatDate(mapping.lastCheckedAt) : "Belum dicek"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!mappings.length ? <EmptyState label="Belum ada mapping SKU. Terapkan migration 021 sebelum menyimpan ke Supabase." /> : null}
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        icon={Boxes}
        eyebrow="Audit read"
        title="Pengecekan stok terbaru"
        description="Snapshot ini hanya menyimpan SKU, warehouse, jumlah stok, dan waktu pengecekan."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {snapshots.slice(0, 12).map((item) => (
            <article key={item.id} className="rounded-xl border border-line bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-extrabold text-ink">{item.stockSku}</p>
                  <p className="mt-1 text-xs text-ink-muted">{item.warehouseName ?? item.gineeWarehouseId ?? "Semua warehouse"}</p>
                </div>
                <span className="text-xl font-extrabold text-brand-900">{item.availableStock}</span>
              </div>
              <p className="mt-3 text-xs text-ink-muted">{formatDate(item.checkedAt)}</p>
            </article>
          ))}
          {!snapshots.length ? <EmptyState label="Belum ada riwayat pengecekan stok." /> : null}
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
      <input
        id={id}
        name={props.name}
        placeholder={props.placeholder}
        required={props.required}
        aria-required={props.required}
        autoComplete="off"
        className="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3 font-medium outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}

function ActionButton({ busy, onClick, children }: { busy: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-busy={busy}
      disabled={busy}
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-bold text-brand-800 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-60"
    >
      <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} aria-hidden="true" />{children}
    </button>
  );
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

function WarehouseStock({ item }: { item: GineeInventory }) {
  return (
    <article className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-brand-800"><Warehouse className="h-5 w-5" aria-hidden="true" /></span>
          <div><p className="font-bold text-ink">{item.warehouseName ?? "Warehouse Ginee"}</p><p className="text-xs text-ink-muted">{item.warehouseId ?? "ID tidak tersedia"}</p></div>
        </div>
        <p className="text-2xl font-extrabold text-brand-900">{item.availableStock}</p>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-slate-50 p-2"><dt className="text-ink-muted">Fisik</dt><dd className="mt-1 font-bold text-ink">{item.warehouseStock}</dd></div>
        <div className="rounded-lg bg-slate-50 p-2"><dt className="text-ink-muted">Reserved</dt><dd className="mt-1 font-bold text-ink">{item.reservedStock}</dd></div>
        <div className="rounded-lg bg-slate-50 p-2"><dt className="text-ink-muted">Locked</dt><dd className="mt-1 font-bold text-ink">{item.lockedStock}</dd></div>
      </dl>
    </article>
  );
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const body = await response.json().catch(() => ({})) as { message?: string } & T;
  if (!response.ok) throw new Error(body.message || "Permintaan Ginee gagal.");
  return body;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
