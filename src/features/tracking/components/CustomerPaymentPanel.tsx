"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

import { formatIDR } from "@/types/product";

interface CustomerPaymentPanelProps {
  orderId: string;
  companyId?: string;
  userId?: string;
}

interface PaymentStatusPayload {
  paymentId: string;
  status: string;
  amount: number;
  paymentUrl: string | null;
  expiredAt: string | null;
  paidAt: string | null;
}

export function CustomerPaymentPanel({
  orderId,
  companyId,
  userId,
}: CustomerPaymentPanelProps) {
  const [payment, setPayment] = useState<PaymentStatusPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!companyId || !userId) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      orderId,
      companyId,
      userId,
    });
    async function loadPayment() {
      try {
        const response = await fetch(`/api/payment/status?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          payment?: PaymentStatusPayload;
        };
        if (response.ok && result.ok && result.payment) {
          setPayment(result.payment);
        }
      } catch {
        if (!controller.signal.aborted) setPayment(null);
      } finally {
        if (!controller.signal.aborted) setLoaded(true);
      }
    }
    void loadPayment();
    return () => controller.abort();
  }, [companyId, orderId, userId]);

  if (!loaded && companyId && userId) {
    return (
      <section className="rounded-2xl border border-line bg-surface p-4 shadow-soft-xs">
        <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-16 animate-pulse rounded bg-slate-100" />
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-soft-xs">
      <p className="type-eyebrow text-brand-700">Pembayaran</p>
      <h2 className="mt-1 text-lg font-bold text-ink">
        {payment ? paymentLabel(payment.status) : "Belum ada payment link"}
      </h2>
      <p className="mt-2 text-sm text-ink-muted">
        {payment
          ? `Total tagihan ${formatIDR(payment.amount)}`
          : "Payment link akan tersedia setelah invoice/payment dibuat oleh tim Ofissio."}
      </p>
      {payment?.expiredAt ? (
        <p className="mt-1 text-xs font-semibold text-ink-muted">
          Berlaku sampai {new Date(payment.expiredAt).toLocaleString("id-ID")}
        </p>
      ) : null}
      {payment?.paidAt ? (
        <p className="mt-1 text-xs font-semibold text-emerald-700">
          Lunas pada {new Date(payment.paidAt).toLocaleString("id-ID")}
        </p>
      ) : null}
      {payment?.paymentUrl && ["pending", "waiting_payment"].includes(payment.status) ? (
        <a
          href={payment.paymentUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-900 px-4 py-3 text-sm font-black text-white"
        >
          <ExternalLink className="h-4 w-4" />
          Bayar Sekarang
        </a>
      ) : null}
    </section>
  );
}

function paymentLabel(status: string) {
  if (status === "paid") return "LUNAS";
  if (status === "failed") return "Pembayaran gagal";
  if (status === "expired") return "Payment link kedaluwarsa";
  if (status === "cancelled") return "Pembayaran dibatalkan";
  if (status === "manual_review") return "Pembayaran sedang diverifikasi manual";
  return "Menunggu pembayaran";
}
