import { z } from "zod";

import {
  SHIPMENT_EVENT_TYPES,
  SHIPMENT_PROVIDERS,
  SHIPMENT_STATUSES,
} from "./shipment.config";

export const shipmentIdParamSchema = z.object({
  id: z.string().trim().min(1).max(180),
});

export const shipmentOrderIdParamSchema = z.object({
  id: z.string().trim().min(1).max(180),
});

export const shipmentListQuerySchema = z.object({
  companyId: z.string().trim().min(1).max(180).optional(),
  orderId: z.string().trim().min(1).max(180).optional(),
  processOrderId: z.string().trim().min(1).max(180).optional(),
  status: z.enum(SHIPMENT_STATUSES).optional(),
});

const nullableText = (max = 240) =>
  z.string().trim().max(max).nullable().optional();

export const createShipmentSchema = z.object({
  provider: z.enum(SHIPMENT_PROVIDERS).default("manual"),
  service: z.string().trim().min(1).max(120).default("Manual delivery"),
  recipientName: nullableText(160),
  recipientPhone: nullableText(80),
  notes: nullableText(1000),
});

export const updateShipmentSchema = z
  .object({
    provider: z.enum(SHIPMENT_PROVIDERS).optional(),
    service: z.string().trim().min(1).max(120).optional(),
    trackingNumber: nullableText(120),
    trackingUrl: z.string().trim().url().max(500).nullable().optional(),
    status: z.enum(SHIPMENT_STATUSES).optional(),
    note: nullableText(1000),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "Payload shipment tidak boleh kosong.",
  });

export const shipmentEventSchema = z.object({
  eventType: z.enum(SHIPMENT_EVENT_TYPES).default("shipment_note_added"),
  note: z.string().trim().min(1).max(1000),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateShipmentPayload = z.infer<typeof createShipmentSchema>;
export type UpdateShipmentPayload = z.infer<typeof updateShipmentSchema>;
export type ShipmentEventPayload = z.infer<typeof shipmentEventSchema>;
