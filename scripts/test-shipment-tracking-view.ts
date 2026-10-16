import assert from "node:assert/strict";
import { recordedShipmentUpdates, shipmentTrackingLink } from "../src/features/tracking/shipment-tracking-view";
import type { ShipmentTimelineEntry } from "../src/features/tracking/tracking.types";

const entries: ShipmentTimelineEntry[] = [
  { id:"future", label:"Terkirim", state:"pending", timestamp:"2026-10-19T12:00:00Z" },
  { id:"placeholder", label:"Siap dikirim", state:"completed" },
  { id:"invalid", label:"Belum valid", state:"current", timestamp:"-" },
  { id:"pickup", label:"Paket dijemput", state:"completed", timestamp:"2026-10-17T09:00:00Z" },
  { id:"hub", label:"Tiba di hub Bandung", state:"current", timestamp:"2026-10-17T11:30:00Z", location:"Bandung" },
];
const before=JSON.stringify(entries);
assert.deepEqual(recordedShipmentUpdates(entries).map(entry=>entry.id),['hub','pickup']);
assert.equal(JSON.stringify(entries),before,'Rendering shipment history must not mutate source data');
assert.deepEqual(recordedShipmentUpdates([]),[]);
assert.equal(shipmentTrackingLink('https://tracking.example.com/ABC123'),'https://tracking.example.com/ABC123');
assert.equal(shipmentTrackingLink('http://tracking.example.com/ABC123'),'http://tracking.example.com/ABC123');
for (const value of [null,undefined,'','/relative','javascript:alert(1)','data:text/html,test']) assert.equal(shipmentTrackingLink(value),null);
console.log('PASS: recorded shipment updates only, newest first, source immutability and valid tracking links.');
