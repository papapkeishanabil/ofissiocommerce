import "server-only";

import { randomUUID } from "node:crypto";

import { getCommerceRuntimeConfig } from "@/features/commerce/commerce.config";
import type { CommerceSyncResult } from "@/features/commerce/commerce.types";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import { SupabaseDatabaseError } from "@/features/database/database.errors";
import type {
  PaymentOrderRecord,
  PaymentRecord,
} from "@/features/payment/payment.types";
import type { QuotationRequestRecord } from "@/features/quotation/quotation.types";
import { repositoryRegistry } from "@/features/repositories/repository.factory";
import { logAuditEvent } from "@/lib/security/audit-log";
import { logInternalError } from "@/lib/security/safe-error-response";

import {
  mapPaymentOrderToWooCommerceOrder,
  mapPaymentStatusToWooCommerceStatus,
} from "./order.mapper";
import type { WooOrderSyncStatus } from "./order.types";
import { woocommerceOrderRepository } from "./repositories/woocommerce-order.repository";
import type {
  WooCommerceCreateOrderInput,
  WooCommerceOrderMeta,
} from "@/features/products/woocommerce/woocommerce.types";

type SyncActorType = "customer" | "internal" | "system";

interface WooOrderSyncInput {
  order: PaymentOrderRecord;
  payment: PaymentRecord;
  request?: Request;
  actorId?: string | null;
  actorType?: SyncActorType;
  companyName?: string | null;
  picName?: string | null;
  picWhatsapp?: string | null;
  quotationId?: string | null;
  quotationNumber?: string | null;
}

interface QuotationSyncInput {
  quotation: QuotationRequestRecord;
  order: PaymentOrderRecord;
  payment: PaymentRecord;
  request?: Request;
  actorId?: string | null;
  actorType?: SyncActorType;
}

export function shouldSyncWooCommerceOrder() {
  const config = getCommerceRuntimeConfig();
  return Boolean(
    config.woocommerce.enabled &&
      config.woocommerce.isConfigured &&
      config.woocommerce.syncOrders,
  );
}

export function getWooOrderSyncStatus(entity?: {
  wooOrderId?: string | null;
  woocommerceOrderId?: string | null;
  wooSyncStatus?: WooOrderSyncStatus;
  orderSyncStatus?: "not_synced" | "synced" | "failed";
  wooSyncError?: string | null;
} | null) {
  const config = getCommerceRuntimeConfig();
  const host = safeWooCommerceHost(config.woocommerce.baseUrl);
  const configured = config.woocommerce.isConfigured;
  const enabled = config.woocommerce.enabled;
  const syncOrders = config.woocommerce.syncOrders;
  const status =
    entity?.wooSyncStatus ??
    (entity?.wooOrderId || entity?.woocommerceOrderId
      ? "synced"
      : syncOrders && enabled && configured
        ? "pending"
        : "disabled");
  const reason = !enabled
    ? "woocommerce_disabled"
    : !configured
      ? "woocommerce_env_missing"
      : !syncOrders
        ? "order_sync_disabled"
        : null;

  return {
    provider: "woocommerce" as const,
    enabled,
    configured,
    syncOrders,
    productSource: config.productSource,
    requestedProductSource: config.requestedProductSource,
    siteHost: host,
    status,
    reason,
    wooOrderId: entity?.wooOrderId ?? entity?.woocommerceOrderId ?? null,
    error: entity?.wooSyncError ?? null,
  };
}

export function getWooCommerceOrderAdminUrl(orderId?: string | null) {
  const config = getCommerceRuntimeConfig();
  if (!orderId || !config.woocommerce.baseUrl) return null;
  try {
    const parsed = new URL(config.woocommerce.baseUrl);
    return `${parsed.origin}/wp-admin/post.php?post=${encodeURIComponent(
      orderId,
    )}&action=edit`;
  } catch {
    return null;
  }
}

export function mapOfissioOrderToWooOrderPayload(input: WooOrderSyncInput) {
  const payload = mapPaymentOrderToWooCommerceOrder(input);
  return attachOfissioMetadataToWooOrder(payload, {
    ofissio_source: "ofissio",
    ofissio_order_id: input.order.id,
    ofissio_order_number: input.order.orderNumber ?? input.order.id,
    quotation_id: input.quotationId ?? input.order.quotationId ?? null,
    quotation_number: input.quotationNumber ?? null,
  });
}

export function mapQuotationToWooOrderPayload(input: QuotationSyncInput) {
  return mapOfissioOrderToWooOrderPayload({
    order: {
      ...input.order,
      quotationId: input.quotation.id,
    },
    payment: input.payment,
    companyName: input.quotation.companyName,
    picName: input.quotation.picName,
    picWhatsapp: input.quotation.picWhatsapp,
    quotationId: input.quotation.id,
    quotationNumber: input.quotation.quotationNumber,
    request: input.request,
    actorId: input.actorId,
    actorType: input.actorType,
  });
}

export function attachOfissioMetadataToWooOrder(
  payload: WooCommerceCreateOrderInput,
  metadata: Record<string, string | number | boolean | null | undefined>,
): WooCommerceCreateOrderInput {
  const appended = compactWooMeta(
    Object.entries(metadata).map(([key, value]) => [key, value] as const),
  );
  return {
    ...payload,
    meta_data: [...(payload.meta_data ?? []), ...appended],
  };
}

export async function createWooCommerceOrderFromOfissioOrder(
  input: WooOrderSyncInput,
): Promise<CommerceSyncResult> {
  const existingWooOrderId = getOrderWooId(input.order);
  if (existingWooOrderId) {
    return {
      ok: true,
      skipped: false,
      provider: "woocommerce",
      externalOrderId: existingWooOrderId,
      externalOrderNumber: input.order.wooOrderNumber ?? null,
      syncStatus: "synced",
      message: "Order sudah pernah tersinkron ke WooCommerce.",
    };
  }

  if (!shouldSyncWooCommerceOrder()) {
    return {
      ok: true,
      skipped: true,
      provider: "mock",
      syncStatus: "disabled",
      message: "WooCommerce order sync tidak aktif.",
    };
  }

  await persistOrderWooSync(input.order, {
    wooSyncStatus: "pending",
    wooSyncError: null,
    wooSyncedAt: null,
    orderSyncStatus: "not_synced",
    woocommerceOrderId: null,
    wooOrderId: null,
    wooOrderNumber: null,
  });

  try {
    const payload = mapOfissioOrderToWooOrderPayload(input);
    const wooOrder = await woocommerceOrderRepository.createOrder({
      ...input,
      order: {
        ...input.order,
        wooSyncStatus: "pending",
      },
      payload,
    });
    const syncedAt = new Date().toISOString();
    await persistOrderWooSync(input.order, {
      wooOrderId: String(wooOrder.id),
      wooOrderNumber: wooOrder.number ? String(wooOrder.number) : String(wooOrder.id),
      wooSyncStatus: "synced",
      wooSyncError: null,
      wooSyncedAt: syncedAt,
      woocommerceOrderId: String(wooOrder.id),
      orderSyncStatus: "synced",
    });
    await recordWooSyncLog({
      companyId: input.order.companyId,
      ofissioOrderId: input.order.id,
      quotationId: input.quotationId ?? input.order.quotationId ?? null,
      wooOrderId: String(wooOrder.id),
      action: "create_order",
      status: "synced",
      safePayload: summarizeWooOrderPayload(payload),
    });
    logAuditEvent({
      request: input.request,
      actorId: input.actorId ?? input.order.userId,
      actorType: input.actorType ?? "customer",
      companyId: input.order.companyId,
      action: "woocommerce_order_created",
      entityType: "order",
      entityId: input.order.id,
      metadata: {
        wooOrderId: wooOrder.id,
        quotationId: input.quotationId ?? input.order.quotationId ?? null,
        phase: "18_woocommerce_staging_order_sync",
      },
    });
    return {
      ok: true,
      skipped: false,
      provider: "woocommerce",
      externalOrderId: String(wooOrder.id),
      externalOrderNumber: wooOrder.number ? String(wooOrder.number) : null,
      syncStatus: "synced",
      message: "Order berhasil disinkronkan ke WooCommerce.",
    };
  } catch (error) {
    const reason = safeWooSyncReason(error);
    await persistOrderWooSync(input.order, {
      wooSyncStatus: "failed",
      wooSyncError: reason,
      wooSyncedAt: null,
      woocommerceOrderId: null,
      orderSyncStatus: "failed",
      wooOrderId: null,
      wooOrderNumber: null,
    });
    await recordWooSyncLog({
      companyId: input.order.companyId,
      ofissioOrderId: input.order.id,
      quotationId: input.quotationId ?? input.order.quotationId ?? null,
      wooOrderId: null,
      action: "create_order",
      status: "failed",
      errorCode: reason,
      errorMessage: "WooCommerce order sync failed.",
    });
    logAuditEvent({
      request: input.request,
      actorId: input.actorId ?? input.order.userId,
      actorType: input.actorType ?? "customer",
      companyId: input.order.companyId,
      action: "woocommerce_order_sync_failed",
      entityType: "order",
      entityId: input.order.id,
      metadata: {
        reason,
        quotationId: input.quotationId ?? input.order.quotationId ?? null,
        phase: "18_woocommerce_staging_order_sync",
      },
    });
    return {
      ok: false,
      skipped: false,
      provider: "woocommerce",
      syncStatus: "failed",
      message: "Order belum berhasil disinkronkan ke WooCommerce.",
    };
  }
}

export async function createWooCommerceOrderFromQuotation(
  input: QuotationSyncInput,
): Promise<CommerceSyncResult> {
  const sync = await createWooCommerceOrderFromOfissioOrder({
    order: {
      ...input.order,
      quotationId: input.quotation.id,
    },
    payment: input.payment,
    request: input.request,
    actorId: input.actorId,
    actorType: input.actorType ?? "internal",
    companyName: input.quotation.companyName,
    picName: input.quotation.picName,
    picWhatsapp: input.quotation.picWhatsapp,
    quotationId: input.quotation.id,
    quotationNumber: input.quotation.quotationNumber,
  });

  await repositoryRegistry.quotations.update(input.quotation.id, {
    wooOrderId: sync.externalOrderId ?? input.quotation.wooOrderId ?? null,
    wooOrderNumber: sync.externalOrderNumber ?? input.quotation.wooOrderNumber ?? null,
    wooSyncStatus: sync.syncStatus ?? (sync.skipped ? "disabled" : "failed"),
    wooSyncError: sync.ok ? null : sync.message,
    wooSyncedAt:
      sync.ok && sync.provider === "woocommerce" && !sync.skipped
        ? new Date().toISOString()
        : input.quotation.wooSyncedAt ?? null,
  });

  return sync;
}

export async function syncOrderToWooCommerce(
  input: WooOrderSyncInput,
): Promise<CommerceSyncResult> {
  return createWooCommerceOrderFromOfissioOrder(input);
}

export async function updateWooCommerceOrderStatus(input: {
  order: PaymentOrderRecord | undefined;
  payment: PaymentRecord | undefined;
  request?: Request;
}) {
  return syncPaymentStatusToWooCommerce(input);
}

export async function syncPaymentStatusToWooCommerce(input: {
  order: PaymentOrderRecord | undefined;
  payment: PaymentRecord | undefined;
  request?: Request;
}): Promise<CommerceSyncResult> {
  const order = input.order;
  const payment = input.payment;
  const wooOrderId = order ? getOrderWooId(order) : null;
  if (!shouldSyncWooCommerceOrder() || !order || !payment || !wooOrderId) {
    return {
      ok: true,
      skipped: true,
      provider: "mock",
      syncStatus: shouldSyncWooCommerceOrder() ? "pending" : "disabled",
      message: "WooCommerce payment status sync tidak aktif.",
    };
  }

  try {
    const status = mapPaymentStatusToWooCommerceStatus(payment.status);
    await woocommerceOrderRepository.updateOrderStatus(wooOrderId, status);
    await recordWooSyncLog({
      companyId: order.companyId,
      ofissioOrderId: order.id,
      quotationId: order.quotationId ?? null,
      wooOrderId,
      action: "update_payment_status",
      status: "synced",
      safePayload: { wooStatus: status, paymentStatus: payment.status },
    });
    logAuditEvent({
      request: input.request,
      actorId: order.userId,
      actorType: "customer",
      companyId: order.companyId,
      action: "woocommerce_payment_status_synced",
      entityType: "order",
      entityId: order.id,
      metadata: { wooOrderId, status },
    });
    return {
      ok: true,
      skipped: false,
      provider: "woocommerce",
      externalOrderId: wooOrderId,
      externalOrderNumber: order.wooOrderNumber ?? null,
      syncStatus: "synced",
      message: "Status payment tersinkron ke WooCommerce.",
    };
  } catch (error) {
    const reason = safeWooSyncReason(error);
    await persistOrderWooSync(order, {
      wooOrderId,
      wooOrderNumber: order.wooOrderNumber ?? null,
      wooSyncStatus: "failed",
      wooSyncError: reason,
      wooSyncedAt: order.wooSyncedAt ?? null,
      woocommerceOrderId: wooOrderId,
      orderSyncStatus: "failed",
    });
    await recordWooSyncLog({
      companyId: order.companyId,
      ofissioOrderId: order.id,
      quotationId: order.quotationId ?? null,
      wooOrderId,
      action: "update_payment_status",
      status: "failed",
      errorCode: reason,
      errorMessage: "WooCommerce payment status sync failed.",
    });
    logAuditEvent({
      request: input.request,
      actorId: order.userId,
      actorType: "customer",
      companyId: order.companyId,
      action: "woocommerce_payment_status_sync_failed",
      entityType: "order",
      entityId: order.id,
      metadata: { wooOrderId, reason },
    });
    return {
      ok: false,
      skipped: false,
      provider: "woocommerce",
      externalOrderId: wooOrderId,
      syncStatus: "failed",
      message: "Status payment belum berhasil disinkronkan ke WooCommerce.",
    };
  }
}

export function buildPaymentSnapshotForWooRetry(
  order: PaymentOrderRecord,
): PaymentRecord {
  const now = new Date().toISOString();
  return {
    id: `pay_retry_${order.id}`,
    orderId: order.id,
    companyId: order.companyId,
    provider: "mock",
    referenceId: order.orderNumber ?? `OF-ORD-${order.id.slice(-8).toUpperCase()}`,
    amount: order.calculation.grandTotal,
    currency: "IDR",
    status: order.status === "payment_received" ? "paid" : "waiting_payment",
    paymentUrl: null,
    rawProviderResponse: { source: "admin_woocommerce_retry" },
    createdAt: order.createdAt,
    updatedAt: now,
  };
}

function getOrderWooId(order: PaymentOrderRecord) {
  return order.wooOrderId ?? order.woocommerceOrderId ?? null;
}

async function persistOrderWooSync(
  order: PaymentOrderRecord,
  patch: NonNullable<Parameters<NonNullable<typeof repositoryRegistry.orders.updateOrderWooSync>>[0]>["patch"],
) {
  await repositoryRegistry.orders.updateOrderWooSync?.({
    companyId: order.companyId,
    orderId: order.id,
    patch,
  });
}

async function recordWooSyncLog(input: {
  companyId: string;
  ofissioOrderId: string;
  quotationId?: string | null;
  wooOrderId?: string | null;
  action: "create_order" | "update_payment_status";
  status: "synced" | "failed";
  safePayload?: Record<string, unknown>;
  errorCode?: string | null;
  errorMessage?: string | null;
}) {
  const client = getSupabaseAdminClient();
  if (!client) return;

  try {
    await client.insert("woo_sync_logs", {
      id: `wsl_${randomUUID()}`,
      company_id: input.companyId,
      ofissio_order_id: input.ofissioOrderId,
      quotation_id: input.quotationId ?? null,
      woo_order_id: input.wooOrderId ?? null,
      direction: "ofissio_to_woocommerce",
      action: input.action,
      status: input.status,
      safe_payload_json: input.safePayload ?? {},
      error_code: input.errorCode ?? null,
      error_message: input.errorMessage ?? null,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    if (
      error instanceof SupabaseDatabaseError &&
      error.reason === "relation_does_not_exist"
    ) {
      return;
    }
    logInternalError(error, {
      area: "woocommerce_order_sync",
      operation: "record_sync_log",
      reason: "log_write_failed",
    });
  }
}

function summarizeWooOrderPayload(payload: WooCommerceCreateOrderInput) {
  return {
    status: payload.status,
    currency: payload.currency,
    lineItemCount: payload.line_items.length,
    shippingLineCount: payload.shipping_lines?.length ?? 0,
    metaKeys: payload.meta_data?.map((meta) => meta.key) ?? [],
  };
}

function compactWooMeta(
  rows: ReadonlyArray<readonly [string, string | number | boolean | null | undefined]>,
): WooCommerceOrderMeta[] {
  return rows
    .filter(([, value]) => value != null && value !== "")
    .map(([key, value]) => ({ key, value: String(value) }));
}

function safeWooCommerceHost(baseUrl: string) {
  if (!baseUrl) return null;
  try {
    return new URL(baseUrl).host;
  } catch {
    return null;
  }
}

function safeWooSyncReason(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("konfigurasi") || message.includes("configured")) {
    return "woocommerce_env_missing";
  }
  if (message.includes("unauthorized") || message.includes("401")) {
    return "woocommerce_auth_failed";
  }
  if (message.includes("timeout") || message.includes("network")) {
    return "woocommerce_network_error";
  }
  return "woocommerce_sync_failed";
}
