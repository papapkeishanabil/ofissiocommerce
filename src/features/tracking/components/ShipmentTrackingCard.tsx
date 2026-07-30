import { Check, Clock3, ExternalLink, MapPin, Truck } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import type { CustomerTrackingOrder } from "@/features/tracking/tracking.types";
import { formatTrackingDate } from "@/features/tracking/tracking.service";

interface ShipmentTrackingCardProps {
  order: CustomerTrackingOrder;
}

export function ShipmentTrackingCard({ order }: ShipmentTrackingCardProps) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
            <Truck className="h-4 w-4 text-brand-700" />
            Tracking pengiriman
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Resi: {order.shippingTrackingNumber ?? "Belum tersedia"}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Layanan:{" "}
            {order.shippingProviderLabel || order.shippingServiceName
              ? `${order.shippingProviderLabel ?? "Manual"} ${order.shippingServiceName ?? ""}`.trim()
              : order.selectedShippingRate
              ? `${order.selectedShippingRate.courierName} ${order.selectedShippingRate.serviceName} - ${order.selectedShippingRate.estimatedDays}`
              : "Belum aktif"}
          </p>
        </div>
        <Badge tone={order.shippingTrackingNumber ? "brand" : "neutral"}>
          {order.shipmentStatus ?? (order.shippingTrackingNumber ? "Terhubung" : "Menunggu")}
        </Badge>
      </div>

      {order.shippingTrackingUrl ? (
        <a
          href={order.shippingTrackingUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-line-strong bg-white px-3 py-2 text-xs font-bold text-brand-700"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Buka tracking kurir
        </a>
      ) : null}

      <ol className="mt-4 space-y-3">
        {order.shipmentTimeline.map((entry) => (
          <li key={entry.id} className="flex gap-3">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-200">
              {entry.state === "completed" ? (
                <Check className="h-3.5 w-3.5 text-emerald-700" />
              ) : entry.state === "current" ? (
                <Clock3 className="h-3.5 w-3.5 text-brand-700" />
              ) : (
                <MapPin className="h-3.5 w-3.5" />
              )}
            </span>
            <div className="min-w-0 flex-1 border-b border-line pb-3 last:border-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-ink">{entry.label}</p>
                <span className="text-[11px] text-ink-muted">
                  {formatTrackingDate(entry.timestamp)}
                </span>
              </div>
              <p className="text-[11px] text-ink-muted">{entry.location ?? "-"}</p>
              {entry.description && (
                <p className="mt-1 text-xs text-ink-muted">{entry.description}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
