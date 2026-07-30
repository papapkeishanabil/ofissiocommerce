import "server-only";

import type {
  PaymentEventRecord,
  PaymentRecord,
} from "@/features/payment/payment.types";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import type { PaymentRepository } from "../repository.types";

type PaymentRow = {
  payment_json?: unknown;
  [key: string]: unknown;
};

type PaymentEventRow = {
  id: string;
  payment_id: string;
  order_id: string;
  company_id: string;
  provider: PaymentEventRecord["provider"];
  event_type: PaymentEventRecord["eventType"];
  old_status: PaymentEventRecord["oldStatus"];
  new_status: PaymentEventRecord["newStatus"];
  reference_id: string;
  amount: number;
  metadata_json: Record<string, unknown>;
  created_at: string;
};

export const supabasePaymentRepository: PaymentRepository = {
  async savePayment(input) {
    const client = getSupabaseAdminClient();
    if (!client) return;
    await client.insert("payments", paymentToRow(input.payment));
  },

  async getPaymentById(input) {
    const client = getSupabaseAdminClient();
    if (!client) return null;
    const rows = await client.select("payments", {
      filters: { id: input.paymentId, company_id: input.companyId },
      limit: 1,
    });
    return rowToPayment(rows[0]);
  },

  async getPaymentByReference(referenceId) {
    const client = getSupabaseAdminClient();
    if (!client) return null;
    const rows = await client.select("payments", {
      filters: { reference_id: referenceId },
      limit: 1,
    });
    return rowToPayment(rows[0]);
  },

  async getPaymentByOrderId(input) {
    const rows = await this.listPaymentsByOrder?.(input);
    return rows?.[0] ?? null;
  },

  async listPaymentsByOrder(input) {
    const client = getSupabaseAdminClient();
    if (!client) return [];
    const rows = await client.select("payments", {
      filters: { order_id: input.orderId, company_id: input.companyId },
      order: "created_at.desc",
    });
    return rows.map(rowToPayment).filter(Boolean) as PaymentRecord[];
  },

  async updatePayment(input) {
    const current = await this.getPaymentById(input);
    if (!current) return null;
    const next: PaymentRecord = {
      ...current,
      ...input.patch,
      updatedAt: new Date().toISOString(),
    };
    await getSupabaseAdminClient()?.update(
      "payments",
      paymentToRow(next),
      { id: input.paymentId, company_id: input.companyId },
    );
    return next;
  },

  async updatePaymentStatus(input) {
    const current = await this.getPaymentById(input);
    if (!current) return null;
    const now = new Date().toISOString();
    const next: PaymentRecord = {
      ...current,
      status: input.status,
      paidAt: input.status === "paid" ? current.paidAt ?? now : current.paidAt,
      failedAt: input.status === "failed" ? current.failedAt ?? now : current.failedAt,
      cancelledAt:
        input.status === "cancelled"
          ? current.cancelledAt ?? now
          : current.cancelledAt,
      rawProviderResponse:
        input.rawProviderResponse === undefined
          ? current.rawProviderResponse
          : input.rawProviderResponse,
      updatedAt: now,
    };
    await getSupabaseAdminClient()?.update(
      "payments",
      paymentToRow(next),
      { id: input.paymentId, company_id: input.companyId },
    );
    return next;
  },

  async addPaymentEvent(event) {
    const client = getSupabaseAdminClient();
    if (!client) return event;
    await client.insert("payment_events", paymentEventToRow(event));
    return event;
  },

  async listPaymentEvents(input) {
    const client = getSupabaseAdminClient();
    if (!client) return [];
    const filters: Record<string, string> = { company_id: input.companyId };
    if (input.paymentId) filters.payment_id = input.paymentId;
    if (input.orderId) filters.order_id = input.orderId;
    const rows = await client.select("payment_events", {
      filters,
      order: "created_at.desc",
    });
    return rows
      .map((row) => rowToPaymentEvent(row as unknown as PaymentEventRow))
      .filter(Boolean) as PaymentEventRecord[];
  },
};

function rowToPayment(row: PaymentRow | undefined): PaymentRecord | null {
  if (!row) return null;
  const fromJson = row.payment_json as PaymentRecord | undefined;
  if (fromJson?.id) return normalizePaymentRecord(fromJson);
  return null;
}

function normalizePaymentRecord(payment: PaymentRecord): PaymentRecord {
  return {
    ...payment,
    providerPaymentId: payment.providerPaymentId ?? null,
    providerTransactionId: payment.providerTransactionId ?? null,
    paymentUrl: payment.paymentUrl ?? null,
    paymentQrUrl: payment.paymentQrUrl ?? null,
    paymentQrDataUrl: payment.paymentQrDataUrl ?? null,
    paymentQrString: payment.paymentQrString ?? null,
    paymentMethod: payment.paymentMethod ?? null,
    paymentChannel: payment.paymentChannel ?? null,
    uniqueCode: payment.uniqueCode ?? 0,
    expiredAt: payment.expiredAt ?? null,
    paidAt: payment.paidAt ?? null,
    failedAt: payment.failedAt ?? null,
    cancelledAt: payment.cancelledAt ?? null,
    callbackReceivedAt: payment.callbackReceivedAt ?? null,
    callbackStatus: payment.callbackStatus ?? null,
    callbackReference: payment.callbackReference ?? null,
    callbackAmount: payment.callbackAmount ?? null,
    callbackRawSafeJson: payment.callbackRawSafeJson ?? null,
    invoiceDocumentId: payment.invoiceDocumentId ?? null,
  };
}

function paymentToRow(payment: PaymentRecord) {
  return {
    id: payment.id,
    order_id: payment.orderId,
    company_id: payment.companyId,
    provider: payment.provider,
    status: payment.status,
    amount: payment.amount,
    reference_id: payment.referenceId,
    provider_payment_id: payment.providerPaymentId,
    provider_transaction_id: payment.providerTransactionId,
    payment_url: payment.paymentUrl,
    payment_qr_url: payment.paymentQrUrl,
    payment_qr_data_url: payment.paymentQrDataUrl,
    payment_qr_string: payment.paymentQrString,
    payment_method: payment.paymentMethod,
    payment_channel: payment.paymentChannel,
    unique_code: payment.uniqueCode,
    expired_at: payment.expiredAt,
    paid_at: payment.paidAt,
    failed_at: payment.failedAt,
    cancelled_at: payment.cancelledAt,
    callback_received_at: payment.callbackReceivedAt,
    callback_status: payment.callbackStatus,
    callback_reference: payment.callbackReference,
    callback_amount: payment.callbackAmount,
    callback_raw_safe_json: payment.callbackRawSafeJson,
    invoice_document_id: payment.invoiceDocumentId,
    raw_safe_metadata_json: safeRaw(payment.rawProviderResponse),
    payment_json: payment,
    created_at: payment.createdAt,
    updated_at: payment.updatedAt,
  };
}

function paymentEventToRow(event: PaymentEventRecord): PaymentEventRow {
  return {
    id: event.id,
    payment_id: event.paymentId,
    order_id: event.orderId,
    company_id: event.companyId,
    provider: event.provider,
    event_type: event.eventType,
    old_status: event.oldStatus,
    new_status: event.newStatus,
    reference_id: event.referenceId,
    amount: event.amount,
    metadata_json: event.metadataJson,
    created_at: event.createdAt,
  };
}

function rowToPaymentEvent(row: PaymentEventRow | undefined): PaymentEventRecord | null {
  if (!row) return null;
  return {
    id: row.id,
    paymentId: row.payment_id,
    orderId: row.order_id,
    companyId: row.company_id,
    provider: row.provider,
    eventType: row.event_type,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    referenceId: row.reference_id,
    amount: row.amount,
    metadataJson: row.metadata_json ?? {},
    createdAt: row.created_at,
  };
}

function safeRaw(value: unknown) {
  return value && typeof value === "object" ? value : {};
}
