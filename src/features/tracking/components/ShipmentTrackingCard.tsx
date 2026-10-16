"use client";

import { useState } from "react";
import { Check, Clock3, Copy, ExternalLink, MapPin, Truck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { CustomerTrackingOrder } from "@/features/tracking/tracking.types";
import { formatTrackingDate } from "@/features/tracking/tracking.service";
import { recordedShipmentUpdates, shipmentTrackingLink } from "../shipment-tracking-view";
import { customerShipmentStatusLabel } from "@/features/shipments/shipment.config";
import type { ShipmentStatus } from "@/features/shipments/shipment.types";
import { carrierStatusLabel } from "@/features/carrier-shipping/carrier-shipping.status";
import type { CarrierShipmentStatus } from "@/features/carrier-shipping/carrier-shipping.types";
import styles from "./ShipmentTrackingCard.module.css";

function updateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

export function ShipmentTrackingCard({ order }: { order: CustomerTrackingOrder }) {
  const trackingNumber = order.shippingTrackingNumber?.trim() || null;
  const trackingUrl = shipmentTrackingLink(order.shippingTrackingUrl);
  const updates = recordedShipmentUpdates(order.shipmentTimeline);
  const scope = `${order.id}:${trackingNumber}`;
  const [feedback, setFeedback] = useState<{ scope: string; error: boolean; message: string } | null>(null);
  const currentFeedback = feedback?.scope === scope ? feedback : null;
  const courier = order.shippingProviderLabel || order.selectedShippingRate?.courierName;
  const service = order.shippingServiceName || order.selectedShippingRate?.serviceName;
  const estimatedStart = order.estimatedArrivalStartDate || order.estimatedDeliveryDate;
  const estimatedEnd = order.estimatedArrivalEndDate;
  const delivered = Boolean(order.actualDeliveredAt) || ["delivered", "completed"].includes(order.currentStageId);
  const hasShipment = Boolean(order.shipmentStatus && !["draft", "waiting_shipment"].includes(order.shipmentStatus)) || updates.length > 0 || Boolean(order.actualCourierPickupAt) || delivered || order.currentStageId === "in_transit";
  const needsAttention = ["failed", "delivery_failed", "returned", "cancelled"].includes(order.shipmentStatus || "");

  async function copyTrackingNumber() {
    if (!trackingNumber) return;
    try {
      await navigator.clipboard.writeText(trackingNumber);
      setFeedback({ scope, error: false, message: "Nomor resi disalin." });
    } catch {
      setFeedback({ scope, error: true, message: "Belum bisa menyalin otomatis. Pilih nomor resi untuk menyalinnya secara manual." });
    }
  }

  return <section className={styles.panel} aria-label="Detail pengiriman">
    <h2 className={styles.heading}><Truck size={17} aria-hidden="true" />Detail pengiriman</h2>
    <dl className={styles.details}>
      {(courier || service) && <div><dt>Kurir &amp; layanan</dt><dd>{[courier, service].filter(Boolean).join(" · ")}</dd></div>}
      <div><dt>Nomor resi</dt><dd>{trackingNumber ? <div className={styles.trackingNumber}><code>{trackingNumber}</code><button type="button" className={styles.copy} onClick={copyTrackingNumber} aria-label="Salin nomor resi">{currentFeedback && !currentFeedback.error ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}Salin</button></div> : "Belum tersedia"}</dd></div>
      {delivered ? order.actualDeliveredAt && <div><dt>Diterima pada</dt><dd>{formatTrackingDate(order.actualDeliveredAt)}</dd></div> : (estimatedStart || estimatedEnd) ? <div><dt>Estimasi tiba</dt><dd>{estimatedStart ? formatTrackingDate(estimatedStart) : formatTrackingDate(estimatedEnd)}{estimatedStart && estimatedEnd && estimatedEnd !== estimatedStart ? ` – ${formatTrackingDate(estimatedEnd)}` : ""}<small>Estimasi dapat berubah sesuai proses pengiriman.</small></dd></div> : order.selectedShippingRate?.estimatedDays && <div><dt>Estimasi layanan</dt><dd>{order.selectedShippingRate.estimatedDays.replace(/days?/gi, "hari")}<small>Dihitung sejak paket dikirim.</small></dd></div>}
    </dl>
    {currentFeedback && <p role="status" className={styles.feedback} data-error={currentFeedback.error}>{currentFeedback.message}</p>}
    {trackingUrl && <a className={styles.trackLink} href={trackingUrl} target="_blank" rel="noopener noreferrer">Lacak pengiriman <ExternalLink size={14} aria-hidden="true" /></a>}
    {(trackingNumber || hasShipment) && <div className={styles.status}><Badge tone={needsAttention ? "warning" : "neutral"}>{shipmentStatusLabel(order)}</Badge>{order.shipmentUpdatedAt && Number.isFinite(Date.parse(order.shipmentUpdatedAt)) && <p className={styles.updated}>Diperbarui {updateTime(order.shipmentUpdatedAt)} WIB</p>}</div>}
    {!trackingNumber && <p className={styles.empty}>{hasShipment ? "Nomor resi belum tersedia. Detail pelacakan akan muncul setelah diperbarui." : "Pengiriman belum dimulai. Nomor resi akan muncul setelah tersedia."}</p>}
    {trackingNumber && !trackingUrl && <p className={styles.empty}>Tautan pelacakan belum tersedia. Gunakan nomor resi di situs resmi kurir.</p>}
    {updates.length > 0 ? <div className={styles.history}><h3>Pembaruan pengiriman</h3><ol className={styles.events}>{updates.map(entry => <li key={entry.id}><span className={styles.eventIcon}>{entry.state === "completed" ? <Check size={13} aria-hidden="true" /> : <MapPin size={13} aria-hidden="true" />}</span><div><h4>{entry.label}</h4>{entry.location && entry.location !== "-" && <p>{entry.location}</p>}{entry.description && <p>{entry.description}</p>}<time dateTime={entry.timestamp!}>{updateTime(entry.timestamp!)} WIB</time></div></li>)}</ol></div> : trackingNumber && <p className={styles.empty}><Clock3 size={13} aria-hidden="true" /> Belum ada pembaruan perjalanan paket.</p>}
  </section>;
}

function shipmentStatusLabel(order: CustomerTrackingOrder) {
  if (!order.shipmentStatus) {
    return order.shippingTrackingNumber ? "Resi tersedia" : "Status belum tersedia";
  }
  const legacyStatuses: ShipmentStatus[] = [
    "draft",
    "ready_to_ship",
    "booked",
    "picked_up",
    "in_transit",
    "delivered",
    "failed",
    "returned",
    "cancelled",
  ];
  if (legacyStatuses.includes(order.shipmentStatus as ShipmentStatus)) {
    return customerShipmentStatusLabel(order.shipmentStatus as ShipmentStatus);
  }
  return carrierStatusLabel(order.shipmentStatus as CarrierShipmentStatus);
}
