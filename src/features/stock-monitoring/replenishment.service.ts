import "server-only";

import { createHash } from "node:crypto";

import { repositoryRegistry } from "@/features/repositories/repository.factory";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createApiError } from "@/lib/security/safe-error-response";

import {
  getReplenishmentRepository,
} from "./replenishment.repository";
import type {
  CreateReplenishmentRequestInput,
  ProductionReplenishmentRequest,
  ReplenishmentReason,
  ReplenishmentRepository,
  WooStockDataSource,
} from "./stock-monitoring.types";
import {
  compareOrderRequirementWithWooStock,
  getWooStockBySku,
  normalizeStockSku,
} from "./woocommerce-stock.service";

export async function requestProductionReplenishment(input: {
  orderId?: string | null;
  parentSku: string;
  stockSku: string;
  reason?: ReplenishmentReason;
  actorId: string;
  request?: Request;
  stockSource?: WooStockDataSource;
  repository?: ReplenishmentRepository;
}) {
  const parentSku = normalizeStockSku(input.parentSku);
  const stockSku = normalizeStockSku(input.stockSku);
  if (!parentSku || !stockSku || !stockSku.startsWith(parentSku)) {
    throw createApiError("VALIDATION_ERROR", "SKU replenishment belum valid.", 400);
  }

  let values: Omit<CreateReplenishmentRequestInput, "createdBy" | "reason">;
  let reason: ReplenishmentReason;
  if (input.orderId) {
    const order = (await repositoryRegistry.orders.listAll?.())?.find(
      (candidate) => candidate.id === input.orderId,
    );
    if (!order) throw createApiError("NOT_FOUND", "Order tidak ditemukan.", 404);
    const comparison = await compareOrderRequirementWithWooStock(
      order,
      input.stockSource,
    );
    const row = comparison.requirements.find(
      (item) => normalizeStockSku(item.stockSku) === stockSku,
    );
    const shortageQty = row?.shortageQty ?? 0;
    if (!row || row.availableQty == null || shortageQty <= 0) {
      throw createApiError(
        "VALIDATION_ERROR",
        "Request hanya dapat dibuat saat kebutuhan order melebihi stok WooCommerce.",
        400,
      );
    }
    values = {
      companyId: order.companyId,
      orderId: order.id,
      parentSku: row.parentSku,
      stockSku: row.stockSku,
      sizeLabel: row.sizeLabel,
      requiredQty: row.requiredQty,
      availableStock: row.availableQty,
      shortageQty,
    };
    reason = "order_shortage";
  } else {
    const stock = await getWooStockBySku(stockSku, input.stockSource);
    if (!stock || stock.stockQuantity == null || stock.shortageToMinimum == null) {
      throw createApiError(
        "VALIDATION_ERROR",
        "Stok SKU belum tersinkron sehingga request belum dapat dihitung.",
        400,
      );
    }
    if (stock.shortageToMinimum <= 0) {
      throw createApiError(
        "VALIDATION_ERROR",
        "Stok SKU masih di atas batas minimum.",
        400,
      );
    }
    values = {
      companyId: null,
      orderId: null,
      parentSku: stock.parentSku,
      stockSku: stock.stockSku,
      sizeLabel: stock.sizeLabel,
      requiredQty: stock.minimumThreshold,
      availableStock: stock.stockQuantity,
      shortageQty: stock.shortageToMinimum,
    };
    reason = input.reason === "replenishment" ? "replenishment" : "low_stock";
  }

  const result = await saveProductionReplenishmentRequest(
    { ...values, reason, createdBy: input.actorId },
    input.repository,
  );

  if (values.orderId && values.companyId) {
    const current = (await repositoryRegistry.orders.listAll?.())?.find(
      (order) => order.id === values.orderId,
    );
    if (current) {
      await repositoryRegistry.orders.updateOrderProcess?.({
        companyId: current.companyId,
        orderId: current.id,
        patch: {
          processRoute: current.processRoute ?? "fulfillment",
          processStatus: current.processStatus ?? "ready_to_process",
          replenishmentStatus: "needed",
          hasCustomization: current.hasCustomization ?? false,
          customizationType: current.customizationType ?? "none",
          processRouteReason: current.processRouteReason ?? null,
          invoicePdfDocumentId: current.invoicePdfDocumentId ?? null,
          invoicePdfGeneratedAt: current.invoicePdfGeneratedAt ?? null,
        },
      });
    }
  }

  logAuditEvent({
    request: input.request,
    actorId: input.actorId,
    actorType: "internal",
    companyId: values.companyId ?? null,
    action: result.idempotent
      ? "production_replenishment_request_reused"
      : "production_replenishment_requested",
    entityType: "production_replenishment_request",
    entityId: result.request.id,
    metadata: {
      orderId: values.orderId,
      parentSku: values.parentSku,
      stockSku: values.stockSku,
      shortageQty: values.shortageQty,
      reason,
      source: "woocommerce",
    },
  });
  return result;
}

export async function saveProductionReplenishmentRequest(
  input: CreateReplenishmentRequestInput,
  repository: ReplenishmentRepository = getReplenishmentRepository(),
): Promise<{ request: ProductionReplenishmentRequest; idempotent: boolean }> {
  const normalized = normalizeRequest(input);
  const idempotencyKey = buildIdempotencyKey(normalized);
  const existing = await repository.findByIdempotencyKey(idempotencyKey);
  if (existing) return { request: existing, idempotent: true };

  const now = new Date().toISOString();
  const request: ProductionReplenishmentRequest = {
    ...normalized,
    id: `repl_${createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 24)}`,
    idempotencyKey,
    status: "requested",
    createdAt: now,
    updatedAt: now,
  };
  const created = await repository.create(request);
  return { request: created, idempotent: created.id !== request.id };
}

export async function listOrderReplenishmentRequests(orderId: string) {
  return getReplenishmentRepository().listByOrder(orderId);
}

function normalizeRequest(input: CreateReplenishmentRequestInput) {
  const requiredQty = nonNegativeInteger(input.requiredQty);
  const availableStock = nonNegativeInteger(input.availableStock);
  const shortageQty = nonNegativeInteger(input.shortageQty);
  if (shortageQty <= 0 || requiredQty <= availableStock) {
    throw createApiError(
      "VALIDATION_ERROR",
      "Request replenishment membutuhkan shortage yang valid.",
      400,
    );
  }
  const parentSku = normalizeStockSku(input.parentSku);
  const stockSku = normalizeStockSku(input.stockSku);
  if (!parentSku || !stockSku || !input.createdBy.trim()) {
    throw createApiError("VALIDATION_ERROR", "Data request replenishment belum lengkap.", 400);
  }
  return {
    companyId: input.companyId?.trim() || null,
    orderId: input.orderId?.trim() || null,
    parentSku,
    stockSku,
    sizeLabel: input.sizeLabel?.trim().toUpperCase() || null,
    requiredQty,
    availableStock,
    shortageQty,
    reason: input.reason,
    createdBy: input.createdBy.trim(),
  };
}

function buildIdempotencyKey(input: ReturnType<typeof normalizeRequest>) {
  return [
    input.orderId ?? "catalog",
    input.parentSku,
    input.stockSku,
    input.reason,
  ].join(":");
}

function nonNegativeInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}
