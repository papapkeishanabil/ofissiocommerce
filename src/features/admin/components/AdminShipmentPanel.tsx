"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { PackageCheck, Plus, RefreshCw, Truck } from "lucide-react";

import { AdminBadge, adminStatusTone } from "./AdminBadge";
import {
  SHIPMENT_PROVIDERS,
  SHIPMENT_STATUSES,
  shipmentProviderLabel,
  shipmentStatusLabel,
} from "@/features/shipments/shipment.config";
import type {
  ShipmentEventRecord,
  ShipmentProvider,
  ShipmentRecord,
  ShipmentStatus,
} from "@/features/shipments/shipment.types";

interface AdminShipmentPanelProps {
  orderId: string;
  processOrderId?: string | null;
  shipments: ShipmentRecord[];
  events?: ShipmentEventRecord[];
  createFrom?: "order" | "process-order";
}

type ShipmentResponse = {
  ok?: boolean;
  message?: string;
  idempotent?: boolean;
  shipment?: ShipmentRecord;
  events?: ShipmentEventRecord[];
};

export function AdminShipmentPanel({
  orderId,
  processOrderId,
  shipments,
  events = [],
  createFrom = "order",
}: AdminShipmentPanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [currentShipment, setCurrentShipment] = useState<ShipmentRecord | null>(
    shipments[0] ?? null,
  );
  const [provider, setProvider] = useState<ShipmentProvider>(
    currentShipment?.provider ?? "manual",
  );
  const [service, setService] = useState(currentShipment?.service ?? "Manual delivery");
  const [trackingNumber, setTrackingNumber] = useState(
    currentShipment?.trackingNumber ?? "",
  );
  const [trackingUrl, setTrackingUrl] = useState(currentShipment?.trackingUrl ?? "");
  const [status, setStatus] = useState<ShipmentStatus>(
    currentShipment?.status ?? "ready_to_ship",
  );
  const latestEvents = useMemo(
    () =>
      events
        .filter((event) =>
          currentShipment ? event.shipmentId === currentShipment.id : true,
        )
        .slice(0, 4),
    [currentShipment, events],
  );

  function createShipment() {
    setMessage(null);
    startTransition(async () => {
      const endpoint =
        createFrom === "process-order" && processOrderId
          ? `/api/admin/process-orders/${encodeURIComponent(processOrderId)}/shipments`
          : `/api/admin/orders/${encodeURIComponent(orderId)}/shipments`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ofissio-internal-role": "super_admin",
          "x-ofissio-internal-user-id": "internal-dev",
        },
        body: JSON.stringify({
          provider,
          service,
          notes: "Shipment manual dibuat dari admin workbench.",
        }),
      });
      const result = (await response.json().catch(() => ({}))) as ShipmentResponse;
      if (!response.ok || !result.ok || !result.shipment) {
        setMessage(result.message ?? "Shipment belum dapat dibuat.");
        return;
      }
      setCurrentShipment(result.shipment);
      setProvider(result.shipment.provider);
      setService(result.shipment.service);
      setStatus(result.shipment.status);
      setTrackingNumber(result.shipment.trackingNumber ?? "");
      setTrackingUrl(result.shipment.trackingUrl ?? "");
      setMessage(result.idempotent ? "Shipment existing dipakai." : "Shipment dibuat.");
      router.refresh();
    });
  }

  function updateCurrentShipment() {
    if (!currentShipment) return;
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(
        `/api/admin/shipments/${encodeURIComponent(currentShipment.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-ofissio-internal-role": "super_admin",
            "x-ofissio-internal-user-id": "internal-dev",
          },
          body: JSON.stringify({
            provider,
            service,
            trackingNumber: trackingNumber || null,
            trackingUrl: trackingUrl || null,
            status,
            note: "Shipment diperbarui dari admin workbench.",
          }),
        },
      );
      const result = (await response.json().catch(() => ({}))) as ShipmentResponse;
      if (!response.ok || !result.ok || !result.shipment) {
        setMessage(result.message ?? "Shipment belum dapat diupdate.");
        return;
      }
      setCurrentShipment(result.shipment);
      setMessage("Shipment diupdate dan tracking customer disinkronkan.");
      router.refresh();
    });
  }

  return (
    <section className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-700">
            Shipment
          </p>
          <h3 className="mt-1 flex items-center gap-2 text-lg font-black text-ink">
            <Truck className="h-5 w-5 text-brand-700" />
            Manual shipping flow
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            Input resi/status manual dulu. Provider API tetap foundation untuk fase berikutnya.
          </p>
        </div>
        <AdminBadge tone={adminStatusTone(currentShipment?.status ?? "draft")}>
          {currentShipment ? shipmentStatusLabel(currentShipment.status) : "not_created"}
        </AdminBadge>
      </div>

      {currentShipment ? (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-line">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-black text-ink">{currentShipment.shipmentNumber}</p>
              <p className="mt-1 text-sm text-ink-muted">
                {shipmentProviderLabel(currentShipment.provider)} · {currentShipment.service}
              </p>
              <p className="mt-1 font-mono text-xs text-ink-muted">
                Resi: {currentShipment.trackingNumber ?? "belum tersedia"}
              </p>
            </div>
            <Link
              href={`/admin/shipments/${currentShipment.id}`}
              className="inline-flex items-center gap-2 rounded-2xl border border-line-strong bg-white px-3 py-2 text-xs font-black text-ink"
            >
              <PackageCheck className="h-4 w-4" />
              Detail shipment
            </Link>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          Shipment belum dibuat. Buat shipment setelah order siap diproses/dikirim.
        </p>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-bold text-ink">
          Provider
          <select
            value={provider}
            onChange={(event) => setProvider(event.target.value as ShipmentProvider)}
            className="mt-1 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm"
          >
            {SHIPMENT_PROVIDERS.map((item) => (
              <option key={item} value={item}>
                {shipmentProviderLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold text-ink">
          Service
          <input
            value={service}
            onChange={(event) => setService(event.target.value)}
            className="mt-1 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm"
            placeholder="Regular / Cargo / Pickup"
          />
        </label>
        <label className="text-sm font-bold text-ink">
          Resi
          <input
            value={trackingNumber}
            onChange={(event) => setTrackingNumber(event.target.value)}
            className="mt-1 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm"
            placeholder="Nomor resi jika ada"
          />
        </label>
        <label className="text-sm font-bold text-ink">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as ShipmentStatus)}
            className="mt-1 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm"
          >
            {SHIPMENT_STATUSES.map((item) => (
              <option key={item} value={item}>
                {shipmentStatusLabel(item)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-3 block text-sm font-bold text-ink">
        Tracking URL manual
        <input
          value={trackingUrl}
          onChange={(event) => setTrackingUrl(event.target.value)}
          className="mt-1 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm"
          placeholder="https://..."
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending || Boolean(currentShipment)}
          onClick={createShipment}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-900 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Buat shipment
        </button>
        <button
          type="button"
          disabled={isPending || !currentShipment}
          onClick={updateCurrentShipment}
          className="inline-flex items-center gap-2 rounded-2xl border border-line-strong bg-white px-4 py-2 text-sm font-black text-ink disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          Update resi/status
        </button>
      </div>

      {latestEvents.length > 0 ? (
        <ol className="mt-4 space-y-2">
          {latestEvents.map((event) => (
            <li key={event.id} className="rounded-2xl bg-slate-50 p-3 text-xs text-ink-muted">
              <span className="font-black text-ink">{event.eventType}</span>
              {event.note ? ` · ${event.note}` : null}
            </li>
          ))}
        </ol>
      ) : null}

      {message ? <p className="mt-3 text-sm font-semibold text-ink-muted">{message}</p> : null}
    </section>
  );
}
