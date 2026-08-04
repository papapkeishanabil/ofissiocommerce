"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, PackageCheck, RefreshCw, Route, Truck } from "lucide-react";

import type {
  CarrierShipmentRecord,
  CarrierShippingEventRecord,
  ShippingQuoteRecord,
} from "@/features/carrier-shipping/carrier-shipping.types";
import { carrierStatusLabel } from "@/features/carrier-shipping/carrier-shipping.status";

interface AdminCarrierShippingPanelProps {
  orderId: string;
  paymentReceived: boolean;
  provider: "mock" | "biteship";
  providerConfigured: boolean;
  initialQuotes: ShippingQuoteRecord[];
  initialShipment: CarrierShipmentRecord | null;
  initialEvents: CarrierShippingEventRecord[];
}

export function AdminCarrierShippingPanel(props: AdminCarrierShippingPanelProps) {
  const [quotes, setQuotes] = useState(props.initialQuotes);
  const [shipment, setShipment] = useState(props.initialShipment);
  const [events, setEvents] = useState(props.initialEvents);
  const [selectedQuoteId, setSelectedQuoteId] = useState(props.initialQuotes[0]?.id ?? "");
  const [busy, setBusy] = useState<"rates" | "create" | "refresh" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latestBatch = useMemo(() => {
    const latest = quotes[0]?.createdAt;
    if (!latest) return quotes;
    return quotes.filter((quote) => Math.abs(Date.parse(quote.createdAt) - Date.parse(latest)) < 5_000);
  }, [quotes]);

  async function checkRates() {
    setBusy("rates");
    resetNotice();
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(props.orderId)}/shipping/rates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = (await response.json()) as { ok?: boolean; quotes?: ShippingQuoteRecord[]; message?: string };
      if (!response.ok || !result.ok || !result.quotes?.length) throw new Error(result.message || "Ongkir belum tersedia.");
      const returnedQuotes = result.quotes;
      setQuotes(returnedQuotes);
      setSelectedQuoteId(returnedQuotes[0]?.id ?? "");
      setMessage(`${returnedQuotes.length} layanan pengiriman ditemukan.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ongkir belum dapat diperiksa.");
    } finally {
      setBusy(null);
    }
  }

  async function createShipment() {
    if (!selectedQuoteId) return;
    setBusy("create");
    resetNotice();
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(props.orderId)}/shipping/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: selectedQuoteId }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        idempotent?: boolean;
        shipment?: CarrierShipmentRecord;
        events?: CarrierShippingEventRecord[];
        message?: string;
      };
      if (!response.ok || !result.ok || !result.shipment) throw new Error(result.message || "Shipment belum dapat dibuat.");
      setShipment(result.shipment);
      setEvents(result.events ?? []);
      setMessage(result.idempotent ? "Shipment aktif digunakan kembali; tidak ada duplikat." : "Shipment berhasil dibuat.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Shipment belum dapat dibuat.");
    } finally {
      setBusy(null);
    }
  }

  async function refreshTracking() {
    setBusy("refresh");
    resetNotice();
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(props.orderId)}/shipping/refresh`, { method: "POST" });
      const result = (await response.json()) as {
        ok?: boolean;
        shipment?: CarrierShipmentRecord;
        events?: CarrierShippingEventRecord[];
        message?: string;
      };
      if (!response.ok || !result.ok || !result.shipment) throw new Error(result.message || "Tracking belum dapat diperbarui.");
      setShipment(result.shipment);
      setEvents(result.events ?? []);
      setMessage("Status carrier sudah diperbarui.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tracking belum dapat diperbarui.");
    } finally {
      setBusy(null);
    }
  }

  function resetNotice() {
    setMessage(null);
    setError(null);
  }

  const disabledReason = !props.paymentReceived
    ? "Pembayaran belum diterima"
    : props.provider === "biteship" && !props.providerConfigured
      ? "Konfigurasi Biteship belum lengkap"
      : null;

  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-white shadow-soft-sm">
      <div className="border-b border-line bg-gradient-to-r from-[#061a56] to-[#12388f] p-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-blue-200">Carrier shipping</p>
            <h2 className="mt-1 flex items-center gap-2 text-xl font-extrabold">
              <Truck className="h-5 w-5" aria-hidden="true" />
              Biteship fulfillment
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-blue-100">
              Ongkir, booking, resi, dan status berasal dari server Ofissio. Nominal tidak dapat diketik manual.
            </p>
          </div>
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide">
            {props.provider}
          </span>
        </div>
      </div>

      <div className="space-y-5 p-5">
        {disabledReason ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900" role="status">
            {disabledReason}. Cek ongkir dan pembuatan shipment dinonaktifkan.
          </div>
        ) : null}
        {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" role="status">{message}</p> : null}
        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800" role="alert">{error}</p> : null}

        {shipment ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                <h3 className="font-extrabold text-ink">Shipment aktif</h3>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
                  {carrierStatusLabel(shipment.shipmentStatus)}
                </span>
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="Kurir" value={shipment.courierCompany.toUpperCase()} />
                <Stat label="Layanan" value={shipment.courierService} />
                <Stat label="Resi / waybill" value={shipment.biteshipWaybillId ?? "Belum tersedia"} />
                <Stat label="Ongkir carrier" value={formatIDR(shipment.shippingPrice)} />
              </dl>
            </div>
            <button
              type="button"
              onClick={refreshTracking}
              disabled={busy !== null}
              className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-line-strong bg-white px-4 py-2 text-sm font-bold text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${busy === "refresh" ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh tracking
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-ink">Pilih layanan carrier</h3>
                <p className="text-sm text-ink-muted">Alamat tujuan dan paket dibaca dari snapshot order/customer.</p>
              </div>
              <button
                type="button"
                onClick={checkRates}
                disabled={Boolean(disabledReason) || busy !== null}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Route className="h-4 w-4" aria-hidden="true" />
                {busy === "rates" ? "Memeriksa..." : "Cek ongkir"}
              </button>
            </div>
            {latestBatch.length > 0 ? (
              <fieldset className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <legend className="sr-only">Pilih quote pengiriman</legend>
                {latestBatch.map((quote) => {
                  const selected = selectedQuoteId === quote.id;
                  return (
                    <label key={quote.id} className={`cursor-pointer rounded-2xl border p-4 transition ${selected ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100" : "border-line bg-slate-50 hover:border-brand-300"}`}>
                      <input
                        type="radio"
                        name="shipping-quote"
                        value={quote.id}
                        checked={selected}
                        onChange={() => setSelectedQuoteId(quote.id)}
                        className="sr-only"
                      />
                      <span className="flex items-start justify-between gap-3">
                        <span>
                          <span className="block font-extrabold text-ink">{quote.courierCompany.toUpperCase()} · {quote.courierType.toUpperCase()}</span>
                          <span className="mt-1 block text-xs text-ink-muted">{quote.courierService} · {quote.duration ?? "Estimasi mengikuti carrier"}</span>
                        </span>
                        <span className="whitespace-nowrap font-extrabold text-brand-800">{formatIDR(quote.shippingPrice)}</span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            ) : (
              <div className="grid min-h-28 place-items-center rounded-2xl border border-dashed border-line-strong bg-slate-50 px-4 text-center text-sm text-ink-muted">
                Klik “Cek ongkir” untuk mengambil layanan yang tersedia.
              </div>
            )}
            <button
              type="button"
              onClick={createShipment}
              disabled={Boolean(disabledReason) || !selectedQuoteId || busy !== null}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#061a56] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#0b2a78] disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
            >
              <PackageCheck className="h-4 w-4" aria-hidden="true" />
              {busy === "create" ? "Membuat shipment..." : "Buat shipment"}
            </button>
          </>
        )}

        {events.length > 0 ? (
          <div className="border-t border-line pt-5">
            <h3 className="flex items-center gap-2 font-extrabold text-ink">
              <Clock3 className="h-4 w-4 text-brand-700" aria-hidden="true" />
              Timeline carrier
            </h3>
            <ol className="mt-3 grid gap-2">
              {events.slice(0, 8).map((event) => (
                <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                  <span className="font-semibold text-ink">{event.newStatus ? carrierStatusLabel(event.newStatus) : event.eventType}</span>
                  <time className="text-xs text-ink-muted">{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.createdAt))}</time>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-muted">{label}</dt>
      <dd className="mt-1 break-words font-bold text-ink">{value}</dd>
    </div>
  );
}

function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}
