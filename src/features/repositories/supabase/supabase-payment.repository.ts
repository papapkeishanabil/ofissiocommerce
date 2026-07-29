import "server-only";

import type { PaymentRecord } from "@/features/payment/payment.types";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import type { PaymentRepository } from "../repository.types";

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
    return (rows[0]?.payment_json as PaymentRecord | undefined) ?? null;
  },

  async getPaymentByReference(referenceId) {
    const client = getSupabaseAdminClient();
    if (!client) return null;
    const rows = await client.select("payments", {
      filters: { reference_id: referenceId },
      limit: 1,
    });
    return (rows[0]?.payment_json as PaymentRecord | undefined) ?? null;
  },

  async updatePaymentStatus(input) {
    const current = await this.getPaymentById(input);
    if (!current) return null;
    const next = {
      ...current,
      status: input.status,
      rawProviderResponse:
        input.rawProviderResponse === undefined
          ? current.rawProviderResponse
          : input.rawProviderResponse,
      updatedAt: new Date().toISOString(),
    };
    await getSupabaseAdminClient()?.update(
      "payments",
      {
        status: input.status,
        raw_safe_metadata_json: safeRaw(input.rawProviderResponse),
        payment_json: next,
        updated_at: next.updatedAt,
      },
      { id: input.paymentId, company_id: input.companyId },
    );
    return next;
  },
};

function paymentToRow(payment: PaymentRecord) {
  return {
    id: payment.id,
    order_id: payment.orderId,
    company_id: payment.companyId,
    provider: payment.provider,
    status: payment.status,
    amount: payment.amount,
    reference_id: payment.referenceId,
    provider_payment_id: null,
    raw_safe_metadata_json: safeRaw(payment.rawProviderResponse),
    payment_json: payment,
    created_at: payment.createdAt,
    updated_at: payment.updatedAt,
  };
}

function safeRaw(value: unknown) {
  return value && typeof value === "object" ? value : {};
}
