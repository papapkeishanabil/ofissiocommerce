"use client";

import { useState, useTransition } from "react";
import { Copy, CreditCard, ExternalLink, RefreshCw } from "lucide-react";

import type {
  PaymentEventRecord,
  PaymentProvider,
  PaymentRecord,
  PaymentStatus,
} from "@/features/payment/payment.types";

interface AdminPaymentPanelProps {
  orderId: string;
  payment: PaymentRecord | null;
  events: PaymentEventRecord[];
  requestedProvider: PaymentProvider;
  activeProvider: PaymentProvider;
  ipaymuConfigured: boolean;
}

export function AdminPaymentPanel({
  orderId,
  payment,
  events,
  requestedProvider,
  activeProvider,
  ipaymuConfigured,
}: AdminPaymentPanelProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [currentPayment, setCurrentPayment] = useState(payment);
  const [isPending, startTransition] = useTransition();
  const providerWarning =
    requestedProvider === "ipaymu" && !ipaymuConfigured
      ? "iPaymu diminta, tetapi env belum aman atau belum lengkap. Create payment dinonaktifkan dan tidak akan fallback diam-diam ke mock."
      : null;
  const providerUnavailable = requestedProvider === "ipaymu" && !ipaymuConfigured;

  function createPayment() {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/admin/orders/${orderId}/payment/create`, {
        method: "POST",
        headers: {
          "x-ofissio-internal-role": "super_admin",
          "x-ofissio-internal-user-id": "internal-dev",
        },
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        paymentId?: string;
        paymentUrl?: string | null;
        expiredAt?: string | null;
        amount?: number;
        status?: PaymentStatus;
        provider?: PaymentProvider;
        idempotent?: boolean;
      };
      if (!response.ok || !result.ok || !result.paymentId || !result.provider || !result.status) {
        setMessage(result.message ?? "Payment link belum dapat dibuat.");
        return;
      }
      setCurrentPayment({
        id: result.paymentId,
        orderId,
        companyId: currentPayment?.companyId ?? "",
        provider: result.provider,
        referenceId: currentPayment?.referenceId ?? orderId,
        providerPaymentId: null,
        providerTransactionId: null,
        amount: result.amount ?? currentPayment?.amount ?? 0,
        currency: "IDR",
        status: result.status,
        paymentUrl: result.paymentUrl ?? null,
        paymentQrUrl: null,
        paymentQrDataUrl: null,
        paymentQrString: null,
        paymentMethod: null,
        paymentChannel: null,
        uniqueCode: 0,
        expiredAt: result.expiredAt ?? null,
        paidAt: null,
        failedAt: null,
        cancelledAt: null,
        callbackReceivedAt: null,
        callbackStatus: null,
        callbackReference: null,
        callbackAmount: null,
        callbackRawSafeJson: null,
        invoiceDocumentId: null,
        rawProviderResponse: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setMessage(result.idempotent ? "Payment existing dipakai." : "Payment link dibuat.");
    });
  }

  async function copyPaymentLink() {
    if (!currentPayment?.paymentUrl) return;
    await navigator.clipboard.writeText(currentPayment.paymentUrl);
    setMessage("Payment link disalin.");
  }

  return (
    <section className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-700">
            Payment
          </p>
          <h3 className="mt-1 text-lg font-black text-ink">
            Payment link & callback foundation
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            Return URL tidak menandai lunas. Status paid hanya dari callback valid.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-ink-muted">
          {currentPayment?.status ?? "not_created"}
        </span>
      </div>

      {providerWarning ? (
        <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          {providerWarning}
        </p>
      ) : null}

      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <Info label="Requested provider" value={requestedProvider} />
        <Info label="Active provider" value={activeProvider} />
        <Info label="iPaymu configured" value={ipaymuConfigured ? "yes" : "no"} />
        <Info label="Amount" value={formatAmount(currentPayment?.amount)} />
        <Info label="Reference" value={currentPayment?.referenceId ?? "-"} />
        <Info label="Expired" value={currentPayment?.expiredAt ?? "-"} />
        <Info label="Paid at" value={currentPayment?.paidAt ?? "-"} />
        <Info label="Callback" value={currentPayment?.callbackStatus ?? "-"} />
        <Info label="Events" value={`${events.length} event`} />
      </dl>

      {currentPayment?.paymentUrl ? (
        <div className="mt-4 rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">
            Payment URL
          </p>
          <p className="mt-1 break-all font-mono text-xs text-ink">
            {currentPayment.paymentUrl}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={
            isPending ||
            providerUnavailable ||
            currentPayment?.status === "paid" ||
            currentPayment?.status === "manual_review"
          }
          onClick={createPayment}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-900 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
        >
          <CreditCard className="h-4 w-4" />
          {currentPayment ? "Refresh payment link" : "Create payment link"}
        </button>
        <button
          type="button"
          disabled={!currentPayment?.paymentUrl || isPending}
          onClick={copyPaymentLink}
          className="inline-flex items-center gap-2 rounded-2xl border border-line-strong bg-white px-4 py-2 text-sm font-black text-ink disabled:opacity-50"
        >
          <Copy className="h-4 w-4" />
          Copy link
        </button>
        {currentPayment?.paymentUrl ? (
          <a
            href={currentPayment.paymentUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border border-line-strong bg-white px-4 py-2 text-sm font-black text-ink"
          >
            <ExternalLink className="h-4 w-4" />
            Open
          </a>
        ) : null}
        <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2 text-xs font-bold text-ink-muted">
          <RefreshCw className="h-4 w-4" />
          Regenerate invoice lewat panel Documents
        </span>
      </div>

      {message ? <p className="mt-3 text-sm font-semibold text-ink-muted">{message}</p> : null}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1 break-words font-semibold text-ink">{value}</dd>
    </div>
  );
}

function formatAmount(value: number | undefined) {
  if (!value) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
