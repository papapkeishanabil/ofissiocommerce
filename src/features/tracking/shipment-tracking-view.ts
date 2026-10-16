import type { ShipmentTimelineEntry } from "./tracking.types";

/** Only recorded updates belong in the shipment history; future milestones do not. */
export function recordedShipmentUpdates(entries: ShipmentTimelineEntry[]) {
  return entries.filter(entry => entry.state !== "pending" && Boolean(entry.timestamp) && Number.isFinite(Date.parse(entry.timestamp!)))
    .sort((a,b) => Date.parse(b.timestamp!) - Date.parse(a.timestamp!));
}

export function shipmentTrackingLink(value?: string | null): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}
