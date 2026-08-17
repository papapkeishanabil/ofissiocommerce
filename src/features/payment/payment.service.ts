import "server-only";

import { randomUUID } from "node:crypto";

import { getValidatedCheckoutCart } from "@/features/checkout/checkout-cart.service";
import {
  syncOrderToWooCommerce,
  syncPaymentStatusToWooCommerce,
} from "@/features/commerce/commerce.service";
import { repositoryRegistry } from "@/features/repositories/repository.factory";
import { deriveOrderProcessRouting } from "@/features/orders/order-routing.service";
import { shippingService } from "@/features/shipping/shipping.service";
import {
  upsertTrackingFromPaymentOrderPersisted,
} from "@/features/tracking/tracking-payment.integration";
import { createApiError } from "@/lib/security/safe-error-response";

import { getPaymentRuntimeConfig } from "./payment.config";
import { getPaymentQrForInvoice } from "./payment-qr.service";
import {
  cachePaymentOrder,
  findPaymentById,
  findPaymentByIdPersisted,
  findPaymentByOrderPersisted,
  findPaymentOrder,
  listPaymentEvents,
  savePaymentPersisted,
  savePaymentEvent,
  updateOrderAfterPayment,
  updateOrderPaymentTerms,
  updatePaymentOrderSync,
  updatePaymentRecord,
  updatePaymentStatus,
} from "./payment.store";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentCalculation,
  PaymentEventRecord,
  PaymentEventType,
  PaymentOrderRecord,
  PaymentProviderAdapter,
  PaymentRecord,
  PaymentStatus,
  ProviderCreatePaymentOutput,
} from "./payment.types";
import { createPaymentSchema } from "./payment.validation";
import { ipaymuProvider } from "./providers/ipaymu.provider";
import { mockPaymentProvider } from "./providers/mock-payment.provider";

const TAX_RATE = 0.11;

type PaymentServiceGlobal = typeof globalThis & {
  __ofissioPaymentCreationLocks?: Map<string, Promise<CreatePaymentResult>>;
};

const paymentCreationLocks =
  (globalThis as PaymentServiceGlobal).__ofissioPaymentCreationLocks ??
  ((globalThis as PaymentServiceGlobal).__ofissioPaymentCreationLocks = new Map());

function activeProvider(): PaymentProviderAdapter {
  return getPaymentRuntimeConfig().provider === "ipaymu"
    ? ipaymuProvider
    : mockPaymentProvider;
}

export async function createPayment(
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  const parsed = createPaymentSchema.parse(input);
  if (parsed.orderId) {
    return createPaymentForOrder({
      orderId: parsed.orderId,
      companyId: parsed.companyId,
      userId: parsed.userId,
    });
  }
  if (!parsed.cartId) {
    throw createApiError("BAD_REQUEST", "cartId atau orderId wajib diisi.", 400);
  }
  return createPaymentFromCart({
    cartId: parsed.cartId,
    companyId: parsed.companyId,
    userId: parsed.userId,
    shippingRateId: parsed.shippingRateId,
  });
}

export async function createPaymentFromCart(input: {
  cartId: string;
  companyId: string;
  userId: string;
  shippingRateId: string | null;
}) {
  const cart = await getValidatedCheckoutCart(
    input.cartId,
    input.companyId,
    input.userId,
  );

  const shippingRate = input.shippingRateId
    ? shippingService.getRateById(input.shippingRateId)
    : null;
  if (input.shippingRateId && !shippingRate) {
    throw new Error("Pilihan ongkir tidak valid atau sudah kedaluwarsa.");
  }

  const calculation: PaymentCalculation = {
    itemSubtotal: cart.subtotal,
    promotionCode: cart.promotionCode,
    discountTotal: cart.discountTotal,
    netItemSubtotal: cart.netSubtotal,
    customizationFee: 0,
    shippingFee: shippingRate?.price ?? 0,
    tax: Math.round(cart.netSubtotal * TAX_RATE),
    grandTotal: 0,
  };
  calculation.grandTotal =
    calculation.itemSubtotal -
    (calculation.discountTotal ?? 0) +
    calculation.customizationFee +
    calculation.shippingFee +
    calculation.tax;

  const now = new Date().toISOString();
  const orderId = `ord_${randomUUID()}`;
  const referenceId = `OF-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const processRouting = deriveOrderProcessRouting({ items: cart.items });

  const order: PaymentOrderRecord = {
    id: orderId,
    orderNumber: referenceId,
    cartId: cart.id,
    companyId: cart.companyId,
    userId: cart.userId,
    items: cart.items,
    shippingRateId: input.shippingRateId,
    selectedShippingRate: shippingRate ? { ...shippingRate } : null,
    calculation,
    status: "waiting_payment",
    quotationId: null,
    ...processRouting,
    wooOrderId: null,
    wooOrderNumber: null,
    wooSyncStatus: "disabled",
    wooSyncError: null,
    wooSyncedAt: null,
    woocommerceOrderId: null,
    orderSyncStatus: "not_synced",
    createdAt: now,
    updatedAt: now,
  };

  const result = await createPaymentForPreparedOrder(order, referenceId, {
    persistOrder: true,
  });
  const payment = await getPaymentRecordById({
    companyId: order.companyId,
    paymentId: result.paymentId,
  });
  const sync = payment ? await syncOrderToWooCommerce({ order, payment }) : null;
  if (sync?.provider === "woocommerce" && !sync.skipped) {
    updatePaymentOrderSync(order.id, {
      wooOrderId: sync.externalOrderId ?? null,
      wooOrderNumber: sync.externalOrderNumber ?? null,
      wooSyncStatus: sync.syncStatus ?? (sync.ok ? "synced" : "failed"),
      wooSyncError: sync.ok ? null : sync.message,
      wooSyncedAt:
        sync.ok && sync.externalOrderId ? new Date().toISOString() : null,
      woocommerceOrderId: sync.externalOrderId ?? null,
      orderSyncStatus: sync.ok ? "synced" : "failed",
    });
  }
  return result;
}

export async function createPaymentForOrder(input: {
  orderId: string;
  companyId: string;
  userId: string;
}): Promise<CreatePaymentResult> {
  const lockKey = `${input.companyId}:${input.orderId}`;
  const activeLock = paymentCreationLocks.get(lockKey);
  if (activeLock) return activeLock;

  const operation = createPaymentForOrderUnlocked(input).finally(() => {
    if (paymentCreationLocks.get(lockKey) === operation) {
      paymentCreationLocks.delete(lockKey);
    }
  });
  paymentCreationLocks.set(lockKey, operation);
  return operation;
}

export async function ensurePaymentForInvoice(input: {
  orderId: string;
  companyId: string;
  userId: string;
}): Promise<PaymentRecord> {
  const result = await createPaymentForOrder(input);
  const payment = await findPaymentByIdPersisted({
    companyId: input.companyId,
    paymentId: result.paymentId,
  });
  if (!payment) {
    throw createApiError(
      "NOT_FOUND",
      "Payment untuk invoice belum tersedia.",
      404,
    );
  }
  if (!payment.paymentUrl) {
    throw createApiError(
      "BAD_REQUEST",
      "Payment link belum tersedia. Invoice belum dapat dibuat.",
      409,
    );
  }
  return payment;
}

async function createPaymentForOrderUnlocked(input: {
  orderId: string;
  companyId: string;
  userId: string;
}): Promise<CreatePaymentResult> {
  const order = await getPaymentOrderGlobal(input.orderId);
  if (!order || order.companyId !== input.companyId) {
    throw createApiError("NOT_FOUND", "Order tidak ditemukan.", 404);
  }
  cachePaymentOrder(order);
  const existing = await findPaymentByOrderPersisted({
    companyId: order.companyId,
    orderId: order.id,
  });
  const balanceIsDue =
    order.paymentTerms?.mode === "deposit_balance" &&
    order.paymentTerms.balanceStatus === "due";
  if ((order.status === "payment_received" || existing?.status === "paid") && !balanceIsDue) {
    if (!existing) {
      throw createApiError("BAD_REQUEST", "Order sudah lunas.", 409);
    }
    return paymentResult(existing, true);
  }
  if (existing?.status === "manual_review") {
    return paymentResult(existing, true);
  }
  if (existing && isReusablePayment(existing)) {
    await ensurePaymentCreatedEvent(existing);
    const activePayment =
      !existing.paymentUrl && existing.status !== "paid"
        ? await refreshPaymentLinkForExistingPayment(existing, order)
        : existing;
    return paymentResult(activePayment, true);
  }

  const referenceId = buildOrderPaymentReference(order, existing);
  return createPaymentForPreparedOrder(order, referenceId, {
    persistOrder: false,
  });
}

async function ensurePaymentCreatedEvent(payment: PaymentRecord) {
  const events = await listPaymentEvents({
    companyId: payment.companyId,
    paymentId: payment.id,
    orderId: payment.orderId,
  }).catch(() => []);
  if (events.some((event) => event.eventType === "payment_created")) return;
  recordPaymentEvent(payment, "payment_created", {
    metadataJson: {
      source: "existing_order_payment",
      phase: "23b_payment_persistence_backfill",
    },
  });
}

export async function getPaymentStatus(input: {
  paymentId?: string;
  orderId?: string;
  companyId: string;
}) {
  const payment = input.paymentId
    ? await getPaymentRecordById({
        companyId: input.companyId,
        paymentId: input.paymentId,
      })
    : input.orderId
      ? await findPaymentByOrderPersisted({
          companyId: input.companyId,
          orderId: input.orderId,
        })
      : null;
  if (!payment) return null;
  const order = await getPaymentOrderGlobal(payment.orderId);
  return publicPaymentStatus(payment, order);
}

export async function getPaymentRecordById(input: {
  companyId: string;
  paymentId: string;
}) {
  return findPaymentByIdPersisted(input);
}

export async function getPaymentEventsForOrder(input: {
  companyId: string;
  orderId: string;
}) {
  return listPaymentEvents(input);
}

export async function completeMockPayment(
  paymentId: string,
  status: "paid" | "failed",
) {
  const payment = findPaymentById(paymentId);
  if (!payment || payment.provider !== "mock") {
    throw new Error("Mock payment tidak ditemukan.");
  }
  if (payment.status === status) {
    const order = findPaymentOrder(payment.orderId);
    const tracking =
      status === "paid" && order
        ? (await upsertTrackingFromPaymentOrderPersisted({ payment, order })).tracking
        : null;
    return { payment, idempotent: true, tracking };
  }
  const previousStatus = payment.status;
  const updated = updatePaymentStatus(paymentId, status, {
    mode: "mock",
    simulatedStatus: status,
  });
  let order = updateOrderAfterPayment(
    payment.orderId,
    status === "paid" ? "payment_received" : "payment_failed",
  );
  if (status === "paid" && order?.paymentTerms?.mode === "deposit_balance") {
    const isBalance = payment.paymentPurpose === "balance";
    order = updateOrderPaymentTerms(
      order.id,
      {
        ...order.paymentTerms,
        amountDueNow: isBalance ? 0 : order.paymentTerms.balanceAmount,
        balanceStatus: isBalance ? "paid" : order.paymentTerms.balanceStatus,
        depositPaidAt: isBalance ? order.paymentTerms.depositPaidAt : new Date().toISOString(),
        balancePaidAt: isBalance ? new Date().toISOString() : order.paymentTerms.balancePaidAt,
      },
      "payment_received",
    );
  }
  if (updated) {
    recordPaymentEvent(updated, status === "paid" ? "payment_paid" : "payment_failed", {
      oldStatus: previousStatus,
      metadataJson: { mode: "mock", simulatedStatus: status },
    });
  }
  const tracking =
    status === "paid" && updated && order
      ? (await upsertTrackingFromPaymentOrderPersisted({ payment: updated, order })).tracking
      : null;
  void syncPaymentStatusToWooCommerce({
    payment: updated,
    order,
  });
  return { payment: updated!, idempotent: false, tracking };
}

export function recordPaymentEvent(
  payment: PaymentRecord,
  eventType: PaymentEventType,
  options: {
    oldStatus?: PaymentStatus | null;
    newStatus?: PaymentStatus | null;
    metadataJson?: Record<string, unknown>;
  } = {},
) {
  const event: PaymentEventRecord = {
    id: `pevt_${randomUUID()}`,
    paymentId: payment.id,
    orderId: payment.orderId,
    companyId: payment.companyId,
    provider: payment.provider,
    eventType,
    oldStatus: options.oldStatus ?? null,
    newStatus: options.newStatus ?? payment.status,
    referenceId: payment.referenceId,
    amount: payment.amount,
    metadataJson: options.metadataJson ?? {},
    createdAt: new Date().toISOString(),
  };
  return savePaymentEvent(event);
}

async function createPaymentForPreparedOrder(
  order: PaymentOrderRecord,
  referenceId: string,
  options: { persistOrder: boolean },
): Promise<CreatePaymentResult> {
  const provider = activeProvider();
  const now = new Date().toISOString();
  const paymentId = `pay_${randomUUID()}`;
  const providerResult = await provider.createPayment({
    paymentId,
    orderId: order.id,
    referenceId,
    amount: order.paymentTerms?.amountDueNow ?? order.calculation.grandTotal,
    currency: "IDR",
    order,
    customer: {
      companyId: order.companyId,
      userId: order.userId,
    },
  });
  const payment = buildPaymentRecord({
    paymentId,
    order,
    referenceId: providerResult.referenceId,
    providerName: provider.name,
    providerResult,
    now,
  });
  await savePaymentPersisted(payment, order, options);
  recordPaymentEvent(payment, "payment_created", {
    metadataJson: { provider: provider.name },
  });
  if (payment.paymentUrl) {
    recordPaymentEvent(payment, "payment_link_created", {
      metadataJson: {
        paymentUrlAvailable: true,
        qrAvailable: getPaymentQrForInvoice(payment).kind !== "none",
      },
    });
  }
  return {
    paymentId: payment.id,
    orderId: payment.orderId,
    paymentUrl: payment.paymentUrl,
    expiredAt: payment.expiredAt,
    amount: payment.amount,
    status: payment.status,
    provider: payment.provider,
    idempotent: false,
    qrAvailable: getPaymentQrForInvoice(payment).kind !== "none",
  };
}

async function refreshPaymentLinkForExistingPayment(
  payment: PaymentRecord,
  order: PaymentOrderRecord,
) {
  const provider = activeProvider();
  const providerResult = await provider.createPayment({
    paymentId: payment.id,
    orderId: order.id,
    referenceId: payment.referenceId,
    amount: payment.amount,
    currency: payment.currency,
    order,
    customer: {
      companyId: order.companyId,
      userId: order.userId,
    },
  });
  const updated =
    updatePaymentRecord(payment.id, {
      provider: provider.name,
      providerPaymentId: providerResult.providerPaymentId ?? null,
      providerTransactionId: providerResult.providerTransactionId ?? null,
      paymentUrl: providerResult.paymentUrl,
      paymentQrUrl: providerResult.paymentQrUrl ?? null,
      paymentQrDataUrl: providerResult.paymentQrDataUrl ?? null,
      paymentQrString: providerResult.paymentQrString ?? null,
      paymentMethod: providerResult.paymentMethod ?? null,
      paymentChannel: providerResult.paymentChannel ?? null,
      uniqueCode: providerResult.uniqueCode ?? 0,
      expiredAt: providerResult.expiredAt ?? null,
      rawProviderResponse: providerResult.rawResponse,
    }) ?? payment;

  recordPaymentEvent(updated, "payment_link_created", {
    metadataJson: {
      refreshed: true,
      provider: provider.name,
      paymentUrlAvailable: Boolean(updated.paymentUrl),
      qrAvailable: getPaymentQrForInvoice(updated).kind !== "none",
    },
  });
  return updated;
}

function buildPaymentRecord(input: {
  paymentId: string;
  order: PaymentOrderRecord;
  referenceId: string;
  providerName: PaymentRecord["provider"];
  providerResult: ProviderCreatePaymentOutput;
  now: string;
}): PaymentRecord {
  const paymentPurpose =
    input.order.paymentTerms?.mode !== "deposit_balance"
      ? "full"
      : input.order.paymentTerms.balanceStatus === "due"
        ? "balance"
        : "deposit";
  return {
    id: input.paymentId,
    orderId: input.order.id,
    companyId: input.order.companyId,
    provider: input.providerName,
    referenceId: input.referenceId,
    providerPaymentId: input.providerResult.providerPaymentId ?? null,
    providerTransactionId: input.providerResult.providerTransactionId ?? null,
    amount: input.order.paymentTerms?.amountDueNow ?? input.order.calculation.grandTotal,
    paymentPurpose,
    currency: "IDR",
    status: "waiting_payment",
    paymentUrl: input.providerResult.paymentUrl,
    paymentQrUrl: input.providerResult.paymentQrUrl ?? null,
    paymentQrDataUrl: input.providerResult.paymentQrDataUrl ?? null,
    paymentQrString: input.providerResult.paymentQrString ?? null,
    paymentMethod: input.providerResult.paymentMethod ?? null,
    paymentChannel: input.providerResult.paymentChannel ?? null,
    uniqueCode: input.providerResult.uniqueCode ?? 0,
    expiredAt: input.providerResult.expiredAt ?? null,
    paidAt: null,
    failedAt: null,
    cancelledAt: null,
    callbackReceivedAt: null,
    callbackStatus: null,
    callbackReference: null,
    callbackAmount: null,
    callbackRawSafeJson: null,
    invoiceDocumentId: input.order.invoicePdfDocumentId ?? null,
    rawProviderResponse: input.providerResult.rawResponse,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

async function getPaymentOrderGlobal(orderId: string) {
  const orders = (await repositoryRegistry.orders.listAll?.()) ?? [];
  const order =
    orders.find((item) => item.id === orderId || item.orderNumber === orderId) ?? null;
  if (order) cachePaymentOrder(order);
  return order ?? findPaymentOrder(orderId);
}

function publicPaymentStatus(
  payment: PaymentRecord,
  order: PaymentOrderRecord | null,
) {
  return {
    paymentId: payment.id,
    orderId: payment.orderId,
    companyId: payment.companyId,
    userId: order?.userId ?? null,
    provider: payment.provider,
    amount: payment.amount,
    paymentPurpose: payment.paymentPurpose ?? "full",
    currency: payment.currency,
    status: payment.status,
    paymentUrl: payment.paymentUrl,
    expiredAt: payment.expiredAt,
    paidAt: payment.paidAt,
    invoiceDocumentId: payment.invoiceDocumentId ?? order?.invoicePdfDocumentId ?? null,
    orderStatus: order?.status ?? null,
    calculation: order?.calculation ?? null,
    paymentTerms: order?.paymentTerms ?? null,
    updatedAt: payment.updatedAt,
  };
}

function isReusablePayment(payment: PaymentRecord) {
  if (!["pending", "waiting_payment"].includes(payment.status)) return false;
  if (!payment.expiredAt) return true;
  return Date.parse(payment.expiredAt) > Date.now();
}

function paymentResult(payment: PaymentRecord, idempotent: boolean): CreatePaymentResult {
  return {
    paymentId: payment.id,
    orderId: payment.orderId,
    paymentUrl: payment.paymentUrl,
    expiredAt: payment.expiredAt,
    amount: payment.amount,
    status: payment.status,
    provider: payment.provider,
    idempotent,
    qrAvailable: getPaymentQrForInvoice(payment).kind !== "none",
  };
}

function buildOrderPaymentReference(
  order: PaymentOrderRecord,
  previous: PaymentRecord | null,
) {
  const base = (order.orderNumber || order.id)
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 120);
  const previousAttempt = previous?.referenceId.match(/-PAY-(\d+)$/)?.[1];
  const attempt = previousAttempt ? Number(previousAttempt) + 1 : previous ? 2 : 1;
  return `${base}-PAY-${attempt}`;
}
