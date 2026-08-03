import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { getPaymentRuntimeConfig } from "../payment.config";
import type {
  NormalizedPaymentCallback,
  PaymentProviderAdapter,
  PaymentStatus,
  ProviderCreatePaymentInput,
  ProviderCreatePaymentOutput,
} from "../payment.types";

type IpaymuCreateResponse = {
  Status?: number;
  Success?: boolean;
  Message?: string;
  Data?: Record<string, unknown>;
  data?: Record<string, unknown>;
};

type CallbackRecord = Record<string, unknown>;

export const ipaymuProvider: PaymentProviderAdapter = {
  name: "ipaymu",

  async createPayment(input: ProviderCreatePaymentInput) {
    return createPaymentLink(input);
  },

  async verifyCallbackSignature(payload: unknown, headers: Headers) {
    return verifyCallbackSignature(payload, headers);
  },

  normalizeCallback(payload: unknown): NormalizedPaymentCallback {
    return parseCallbackPayload(payload);
  },

  mapProviderStatusToInternalStatus(providerStatus: string): PaymentStatus {
    return getPaymentStatusFromCallback(providerStatus);
  },
};

export function isIpaymuConfigured() {
  return getPaymentRuntimeConfig().ipaymu.isComplete;
}

export async function createPaymentLink(
  input: ProviderCreatePaymentInput,
): Promise<ProviderCreatePaymentOutput> {
  const config = getPaymentRuntimeConfig();
  if (config.requestedProvider !== "ipaymu" || !config.ipaymu.isComplete) {
    throw new Error("Konfigurasi iPaymu belum aman atau belum lengkap.");
  }

  const body = buildCreatePaymentBody(input, config.ipaymu.expireMinutes);
  const bodyJson = JSON.stringify(body);
  const timestamp = timestampForIpaymu();
  const signature = createIpaymuApiSignature({
    method: "POST",
    va: config.ipaymu.va,
    apiKey: config.ipaymu.apiKey,
    bodyJson,
  });
  const url = `${config.ipaymu.baseUrl.replace(/\/+$/, "")}/api/v2/payment`;
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        va: config.ipaymu.va,
        signature,
        timestamp,
      },
      body: bodyJson,
      cache: "no-store",
    });
  } catch {
    throw new Error("Koneksi iPaymu belum dapat dihubungi.");
  }

  const payload = (await response.json().catch(() => ({}))) as IpaymuCreateResponse;
  if (!response.ok || isProviderError(payload)) {
    throw new Error(getSafeProviderError(payload, response.status));
  }
  return mapIpaymuCreatePaymentResponse(input, payload, config.ipaymu.expireMinutes);
}

export function mapIpaymuCreatePaymentResponse(
  input: ProviderCreatePaymentInput,
  payload: IpaymuCreateResponse,
  expireMinutes: number,
): ProviderCreatePaymentOutput {
  const data = payload.Data ?? payload.data ?? {};
  const paymentUrl = firstString(data, [
    "Url",
    "url",
    "PaymentUrl",
    "paymentUrl",
    "payment_url",
    "RedirectUrl",
    "redirectUrl",
  ]);
  if (!paymentUrl) {
    throw new Error("iPaymu belum mengembalikan payment URL.");
  }

  return {
    referenceId: input.referenceId,
    paymentUrl,
    providerPaymentId: firstString(data, [
      "SessionID",
      "SessionId",
      "sessionId",
      "sid",
      "paymentId",
    ]),
    providerTransactionId: firstString(data, [
      "TransactionId",
      "TransactionID",
      "trx_id",
      "trxId",
    ]),
    paymentQrUrl: firstString(data, ["QrUrl", "qrUrl", "qrisUrl", "QRISUrl"]),
    paymentQrDataUrl: firstString(data, ["QrDataUrl", "qrDataUrl", "qrData"]),
    paymentQrString: firstString(data, ["QrString", "qrString", "qrisString"]),
    paymentMethod: firstString(data, ["PaymentMethod", "paymentMethod", "via"]),
    paymentChannel: firstString(data, ["PaymentChannel", "paymentChannel", "channel"]),
    uniqueCode: firstNumber(data, ["UniqueCode", "uniqueCode", "unique_code"]) ?? 0,
    expiredAt:
      firstString(data, ["ExpiredAt", "expiredAt", "expired_at"]) ??
      new Date(Date.now() + expireMinutes * 60 * 1000).toISOString(),
    rawResponse: safeCreateResponse(payload),
  };
}

export function verifyCallbackSignature(payload: unknown, headers: Headers) {
  const config = getPaymentRuntimeConfig();
  if (!config.ipaymu.va) return false;
  const received =
    headers.get("x-signature") ??
    headers.get("X-Signature") ??
    headerFromObject(payload, "x-signature") ??
    headerFromObject(payload, "signature");
  if (!received || !/^[a-f0-9]{64}$/i.test(received)) return false;

  const normalized = normalizeCallbackForSignature(payload);
  let jsonBody = JSON.stringify(sortObjectKeys(normalized));
  jsonBody = jsonBody.replace(/\//g, "\\/");
  const calculated = createHmac("sha256", config.ipaymu.va)
    .update(jsonBody)
    .digest("hex");

  return safeEqualHex(calculated, received);
}

export function parseCallbackPayload(payload: unknown): NormalizedPaymentCallback {
  const record = toRecord(payload);
  const referenceId = stringValue(record.reference_id ?? record.referenceId);
  if (!referenceId) throw new Error("Reference callback iPaymu kosong.");
  const amount = numberValue(record.amount ?? record.total ?? record.sub_total);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount callback iPaymu tidak valid.");
  }
  const providerStatus = stringValue(
    record.status_code ?? record.transaction_status_code ?? record.status,
  );
  const providerPaymentId = stringValue(record.sid ?? record.payment_no);
  const providerTransactionId = stringValue(record.trx_id ?? record.trscode ?? record.transaction_id);
  const eventId =
    stringValue(record.trx_id ?? record.trscode ?? record.sid) ??
    `${referenceId}:${providerStatus}:${amount}`;

  return {
    referenceId,
    amount,
    providerStatus: providerStatus ?? "unknown",
    eventId,
    providerPaymentId,
    providerTransactionId,
    paymentMethod: stringValue(record.via),
    paymentChannel: stringValue(record.channel),
    paidAt: stringValue(record.paid_at),
    callbackStatus: stringValue(record.status),
    rawSafeJson: safeCallbackSnapshot(record),
  };
}

export function getPaymentStatusFromCallback(providerStatus: string): PaymentStatus {
  const normalized = providerStatus.toLowerCase().trim();
  if (normalized === "1" || normalized === "6" || normalized === "berhasil" || normalized === "paid") {
    return "paid";
  }
  if (normalized === "-2" || normalized === "expired") return "expired";
  if (normalized === "cancelled" || normalized === "canceled" || normalized === "dibatalkan") {
    return "cancelled";
  }
  if (normalized === "0" || normalized === "pending") return "waiting_payment";
  if (normalized === "-1" || normalized === "failed" || normalized === "gagal") {
    return "failed";
  }
  return "manual_review";
}

export function getSafeProviderError(payload: IpaymuCreateResponse, status: number) {
  const message = String(payload.Message ?? payload.data?.Message ?? "").toLowerCase();
  if (status === 401 || message.includes("signature") || message.includes("credential")) {
    return "Kredensial iPaymu belum valid.";
  }
  if (message.includes("domain") || message.includes("ip")) {
    return "Domain/IP iPaymu belum tervalidasi.";
  }
  if (message.includes("expired")) return "Payment iPaymu kedaluwarsa.";
  return "Payment link iPaymu belum dapat dibuat.";
}

export function buildCreatePaymentBody(
  input: ProviderCreatePaymentInput,
  expireMinutes: number,
) {
  const config = getPaymentRuntimeConfig().ipaymu;
  const items = input.order?.items ?? [];
  const itemSummary = items
    .map((item) => `${item.sku} (${item.totalQty} pcs)`)
    .slice(0, 5)
    .join(", ");

  // iPaymu derives the payable amount from product × qty × price. Use one
  // backend-authoritative invoice line so tax, shipping, discounts, and
  // customization cannot be dropped or recalculated by a client payload.
  const product = [`Invoice Ofissio ${input.referenceId}`];
  const qty = [1];
  const price = [input.amount];
  const description = [itemSummary || `Pembayaran order ${input.orderId}`];

  return {
    product,
    qty,
    price,
    description,
    returnUrl: config.returnUrl,
    notifyUrl: config.notifyUrl,
    cancelUrl: config.cancelUrl,
    referenceId: input.referenceId,
    expired: expireMinutes,
  };
}

function createIpaymuApiSignature(input: {
  method: "GET" | "POST";
  va: string;
  apiKey: string;
  bodyJson: string;
}) {
  const bodyHash = createHash("sha256").update(input.bodyJson).digest("hex").toLowerCase();
  const stringToSign = `${input.method}:${input.va}:${bodyHash}:${input.apiKey}`;
  return createHmac("sha256", input.apiKey).update(stringToSign).digest("hex");
}

function normalizeCallbackForSignature(payload: unknown) {
  const raw = toRecord(payload);
  const result: CallbackRecord = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key.toLowerCase() === "signature") continue;
    if (key === "is_escrow") {
      result[key] = value === true || value === "true" || value === "1" || value === 1;
    } else if (["trx_id", "status_code", "transaction_status_code", "paid_off"].includes(key)) {
      result[key] = Number.parseInt(String(value), 10);
    } else if (key === "additional_info") {
      result[key] = value === "[]" || value === undefined || value === null ? [] : value;
    } else if (value === null) {
      result[key] = "null";
    } else {
      result[key] = String(value);
    }
  }
  if (!Object.prototype.hasOwnProperty.call(result, "additional_info")) {
    result.additional_info = [];
  }
  return result;
}

function sortObjectKeys(record: CallbackRecord) {
  return Object.keys(record)
    .sort((a, b) => a.localeCompare(b))
    .reduce<CallbackRecord>((sorted, key) => {
      sorted[key] = record[key];
      return sorted;
    }, {});
}

function safeEqualHex(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function timestampForIpaymu() {
  return new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

function isProviderError(payload: IpaymuCreateResponse) {
  if (payload.Success === false) return true;
  if (typeof payload.Status === "number" && payload.Status >= 400) return true;
  return false;
}

function firstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = stringValue(record[key]);
    if (value) return value;
  }
  return null;
}

function firstNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = numberValue(record[key]);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function stringValue(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function numberValue(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.replace(/[^\d-]/g, ""), 10);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
}

function toRecord(payload: unknown): CallbackRecord {
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as CallbackRecord)
    : {};
}

function headerFromObject(payload: unknown, key: string) {
  const record = toRecord(payload);
  return stringValue(record[key]);
}

function safeCreateResponse(payload: IpaymuCreateResponse) {
  const data = payload.Data ?? payload.data ?? {};
  return {
    status: payload.Status ?? null,
    success: payload.Success ?? null,
    message: payload.Message ?? null,
    data: {
      sessionId: firstString(data, ["SessionID", "SessionId", "sid"]),
      urlAvailable: Boolean(firstString(data, ["Url", "url", "PaymentUrl", "paymentUrl"])),
      qrAvailable: Boolean(firstString(data, ["QrUrl", "qrUrl", "QrString", "qrString"])),
    },
  };
}

function safeCallbackSnapshot(record: CallbackRecord) {
  return {
    reference_id: stringValue(record.reference_id ?? record.referenceId),
    status: stringValue(record.status),
    status_code: stringValue(record.status_code),
    transaction_status_code: stringValue(record.transaction_status_code),
    amount: stringValue(record.amount),
    total: stringValue(record.total),
    trx_id: stringValue(record.trx_id),
    sid: stringValue(record.sid),
    channel: stringValue(record.channel),
    via: stringValue(record.via),
    paid_at: stringValue(record.paid_at),
  };
}
