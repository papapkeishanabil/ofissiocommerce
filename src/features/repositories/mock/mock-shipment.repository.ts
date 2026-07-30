import "server-only";

import type {
  ShipmentEventRecord,
  ShipmentRecord,
} from "@/features/shipments/shipment.types";
import { isActiveShipment } from "@/features/shipments/shipment.utils";
import type { ShipmentRepository } from "../repository.types";

type ShipmentGlobal = typeof globalThis & {
  __ofissioRepositoryShipments?: Map<string, ShipmentRecord>;
  __ofissioRepositoryShipmentEvents?: Map<string, ShipmentEventRecord>;
};

const shipmentGlobal = globalThis as ShipmentGlobal;
const shipments =
  shipmentGlobal.__ofissioRepositoryShipments ??
  (shipmentGlobal.__ofissioRepositoryShipments = new Map<string, ShipmentRecord>());
const shipmentEvents =
  shipmentGlobal.__ofissioRepositoryShipmentEvents ??
  (shipmentGlobal.__ofissioRepositoryShipmentEvents = new Map<string, ShipmentEventRecord>());

export const mockShipmentRepository: ShipmentRepository = {
  async createShipment(input) {
    shipments.set(input.shipment.id, input.shipment);
    return input.shipment;
  },
  async updateShipment(input) {
    const current = shipments.get(input.shipmentId);
    if (!current || (input.companyId && current.companyId !== input.companyId)) {
      return null;
    }
    const next: ShipmentRecord = {
      ...current,
      ...input.patch,
      updatedAt: new Date().toISOString(),
    };
    shipments.set(next.id, next);
    return next;
  },
  async getShipmentById(input) {
    const shipment = shipments.get(input.shipmentId);
    if (!shipment || (input.companyId && shipment.companyId !== input.companyId)) {
      return null;
    }
    return shipment;
  },
  async getActiveShipmentByOrder(input) {
    return (
      [...shipments.values()].find(
        (shipment) =>
          shipment.orderId === input.orderId &&
          (!input.companyId || shipment.companyId === input.companyId) &&
          isActiveShipment(shipment),
      ) ?? null
    );
  },
  async getShipmentByProcessOrder(input) {
    return (
      [...shipments.values()].find(
        (shipment) =>
          shipment.processOrderId === input.processOrderId &&
          (!input.companyId || shipment.companyId === input.companyId) &&
          isActiveShipment(shipment),
      ) ?? null
    );
  },
  async listShipments(input = {}) {
    return [...shipments.values()]
      .filter((shipment) => (input.includeDeleted ? true : !shipment.deletedAt))
      .filter((shipment) => (input.companyId ? shipment.companyId === input.companyId : true))
      .filter((shipment) => (input.orderId ? shipment.orderId === input.orderId : true))
      .filter((shipment) =>
        input.processOrderId ? shipment.processOrderId === input.processOrderId : true,
      )
      .filter((shipment) => (input.status ? shipment.status === input.status : true))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  },
  async addShipmentEvent(input) {
    shipmentEvents.set(input.event.id, input.event);
    return input.event;
  },
  async listShipmentEvents(input) {
    return [...shipmentEvents.values()]
      .filter((event) => (input.shipmentId ? event.shipmentId === input.shipmentId : true))
      .filter((event) => (input.orderId ? event.orderId === input.orderId : true))
      .filter((event) => (input.companyId ? event.companyId === input.companyId : true))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  },
};
