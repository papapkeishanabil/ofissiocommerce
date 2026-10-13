"use client";

import { useEffect, useState } from "react";
import { ExternalLink, LoaderCircle } from "lucide-react";

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
  paymentPurpose?: "full" | "deposit" | "balance";
  paymentUrl: string | null;
  expiredAt: string | null;
  paidAt: string | null;
  paymentTerms?: {
    mode: "full" | "deposit_balance";
    depositPercent: number;
    depositAmount: number;
    balanceAmount: number;
    balanceStatus: string;
  } | null;
}

export function CustomerPaymentPanel({
  orderId,
  companyId,
  userId,
}: CustomerPaymentPanelProps) {
  const [payment, setPayment] = useState<PaymentStatusPayload | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [creatingBalance, setCreatingBalance] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const linkExpired = Boolean(
    payment?.expiredAt && currentTime && Date.parse(payment.expiredAt) <= currentTime,
  );

  useEffect(() => {
    const refresh = () => setCurrentTime(Date.now());
    const initial = window.setTimeout(refresh, 0);
    const interval = window.setInterval(refresh, 60_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, []);

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

  async function createBalancePayment() {
    if (!companyId || !userId) return;
    setCreatingBalance(true);
    setCreateError(null);
    try {
      const response = await fetch("/api/payment/ipaymu/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, companyId, userId, shippingRateId: null }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        paymentUrl?: string | null;
        error?: string;
      };
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Tagihan pelunasan belum dapat dibuat.");
      }
      if (result.paymentUrl) window.location.assign(result.paymentUrl);
      else window.location.reload();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Tagihan pelunasan belum dapat dibuat.");
    } finally {
      setCreatingBalance(false);
    }
  }

  if (!loaded && companyId && userId) {
    return (
      <section className="rounded-2xl border border-white/70 bg-white/65 p-4 shadow-soft-md backdrop-blur-xl">
        <div className="h-5 w-32 animate-pulse rounded bg-cool-200" />
        <div className="mt-3 h-16 animate-pulse rounded bg-cool-100" />
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/70 bg-white/65 p-4 shadow-soft-md backdrop-blur-xl">
      <h2 className="text-lg font-bold text-ink">
        {payment ? paymentLabel(payment.status, payment.paymentTerms?.mode === "deposit_balance", payment.paymentPurpose) : "Belum ada payment link"}
      </h2>
      <p className="mt-2 text-sm text-ink-muted">
        {payment
          ? payment.paymentTerms?.mode === "deposit_balance"
            ? `DP ${payment.paymentTerms.depositPercent}% sebesar ${formatIDR(payment.paymentTerms.depositAmount)}. Sisa ${formatIDR(payment.paymentTerms.balanceAmount)} dilunasi setelah produksi selesai sebelum pengiriman.`
            : `Total tagihan ${formatIDR(payment.amount)}`
          : "Payment link akan tersedia setelah invoice/payment dibuat oleh tim Ofissio."}
      </p>
      {payment?.expiredAt ? (
        <p className="mt-1 text-xs font-semibold text-ink-muted">
          Berlaku sampai {new Date(payment.expiredAt).toLocaleString("id-ID")}
        </p>
      ) : null}
      {payment?.paidAt ? (
        <p className="mt-1 text-xs font-semibold text-emerald-700">
          {payment.paymentPurpose === "balance" ? "Pelunasan diterima" : payment.paymentTerms?.mode === "deposit_balance" ? "DP diterima" : "Lunas"} pada {new Date(payment.paidAt).toLocaleString("id-ID")}
        </p>
      ) : null}
      {payment?.paymentTerms?.mode === "deposit_balance" &&
      payment.paymentTerms.balanceStatus === "due" &&
      payment.status === "paid" ? (
        <button
          type="button"
          onClick={createBalancePayment}
          disabled={creatingBalance}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-900 px-4 py-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60"
        >
          {creatingBalance ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          Bayar Pelunasan {formatIDR(payment.paymentTerms.balanceAmount)}
        </button>
      ) : null}
      {createError ? <p className="mt-2 text-xs font-semibold text-red-700">{createError}</p> : null}
      {payment && ["failed", "expired", "cancelled"].includes(payment.status) ? (
        <p className="mt-3 text-sm font-semibold text-amber-800">
          Jangan bayar ulang jika saldo sudah terpotong. Hubungi tim Ofissio untuk memeriksa transaksi dan membuat tautan baru.
        </p>
      ) : null}
      {linkExpired && payment && ["pending", "waiting_payment"].includes(payment.status) ? (
        <p className="mt-3 text-sm font-semibold text-amber-800">
          Tautan pembayaran telah melewati masa berlaku. Hubungi tim Ofissio untuk memeriksa status pembayaran sebelum meminta tautan baru.
        </p>
      ) : null}
      {payment?.paymentUrl && !linkExpired && ["pending", "waiting_payment"].includes(payment.status) ? (
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

function paymentLabel(
  status: string,
  isDeposit: boolean,
  purpose?: PaymentStatusPayload["paymentPurpose"],
) {
  if (status === "paid") return purpose === "balance" ? "LUNAS" : isDeposit ? "DP diterima" : "LUNAS";
  if (status === "failed") return "Pembayaran gagal";
  if (status === "expired") return "Payment link kedaluwarsa";
  if (status === "cancelled") return "Pembayaran dibatalkan";
  if (status === "manual_review") return "Pembayaran sedang diverifikasi manual";
  return "Menunggu pembayaran";
}
