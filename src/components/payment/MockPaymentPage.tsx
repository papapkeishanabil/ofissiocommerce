"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleX,
  CreditCard,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { formatIDR } from "@/types/product";

interface PaymentStatusView {
  paymentId: string;
  orderId: string;
  amount: number;
  status: string;
  orderStatus: string | null;
  provider: string;
  calculation: {
    itemSubtotal: number;
    customizationFee: number;
    shippingFee: number;
    tax: number;
    grandTotal: number;
  } | null;
}

export function MockPaymentPage({
  paymentId,
  initialSimulation = "paid",
}: {
  paymentId: string;
  initialSimulation?: "paid" | "failed";
}) {
  const [payment, setPayment] = useState<PaymentStatusView | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!paymentId) {
      setMessage("Status pembayaran belum dapat diverifikasi.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(
        `/api/payment/status?paymentId=${encodeURIComponent(paymentId)}`,
        { cache: "no-store" },
      );
      const result = (await response.json()) as {
        ok: boolean;
        payment?: PaymentStatusView;
        message?: string;
      };
      if (!response.ok || !result.payment) {
        throw new Error(result.message);
      }
      setPayment(result.payment);
      setMessage(null);
    } catch {
      setMessage("Status pembayaran belum dapat diverifikasi.");
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function simulate(status: "paid" | "failed") {
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/payment/mock/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, status }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        payment?: PaymentStatusView;
        message?: string;
      };
      if (!response.ok || !result.payment) {
        throw new Error(result.message);
      }
      setPayment(result.payment);
      setMessage(
        status === "paid"
          ? "Pembayaran mock berhasil dikonfirmasi."
          : "Pembayaran mock disimulasikan gagal.",
      );
    } catch {
      setMessage("Status pembayaran belum dapat diverifikasi.");
    } finally {
      setSubmitting(false);
    }
  }

  const paid = payment?.status === "paid";
  const failed = payment?.status === "failed";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 lg:px-8">
      <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-soft-sm">
        <div className="bg-gradient-to-br from-brand-800 to-brand-950 px-6 py-7 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-200">
                Development sandbox
              </p>
              <h1 className="mt-1 text-xl font-bold">Pembayaran Mock Ofissio</h1>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex items-start gap-3 rounded-2xl bg-surface-muted p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            <p className="text-sm leading-relaxed text-ink-muted">
              Halaman ini tidak memproses uang. Gunakan untuk menguji callback
              dan perubahan status selama provider iPaymu belum diaktifkan.
            </p>
          </div>

          {loading ? (
            <div
              className="flex min-h-32 items-center justify-center gap-2 text-sm text-ink-muted"
              role="status"
            >
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Memeriksa payment…
            </div>
          ) : payment ? (
            <>
              <div className="rounded-2xl border border-line p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-ink-muted">Total backend</p>
                    <p className="mt-1 text-2xl font-bold text-ink">
                      {formatIDR(payment.amount)}
                    </p>
                  </div>
                  <span
                    className={
                      "rounded-full px-3 py-1 text-xs font-bold " +
                      (paid
                        ? "bg-emerald-50 text-emerald-700"
                        : failed
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700")
                    }
                  >
                    {paid
                      ? "Lunas"
                      : failed
                        ? "Gagal"
                        : "Menunggu pembayaran"}
                  </span>
                </div>
                <dl className="mt-4 grid gap-2 border-t border-line pt-3 text-xs text-ink-muted sm:grid-cols-2">
                  <div>
                    <dt>Payment ID</dt>
                    <dd className="mt-0.5 break-all font-mono text-ink">
                      {payment.paymentId}
                    </dd>
                  </div>
                  <div>
                    <dt>Order ID</dt>
                    <dd className="mt-0.5 break-all font-mono text-ink">
                      {payment.orderId}
                    </dd>
                  </div>
                </dl>
              </div>

              {!paid && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    onClick={() => void simulate("paid")}
                    disabled={submitting}
                    aria-busy={submitting}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {submitting && initialSimulation === "paid"
                      ? "Memproses…"
                      : "Simulasikan Berhasil"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void simulate("failed")}
                    disabled={submitting}
                    aria-busy={submitting}
                  >
                    <CircleX className="h-4 w-4" />
                    Simulasikan Gagal
                  </Button>
                </div>
              )}
            </>
          ) : null}

          {message && (
            <p
              role="status"
              className={
                "rounded-xl px-3 py-2 text-sm " +
                (paid
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-800")
              }
            >
              {message}
            </p>
          )}

          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <ButtonLink href="/catalog" variant="outline">
              Kembali ke katalog
            </ButtonLink>
            <ButtonLink href="/dashboard">Buka dashboard</ButtonLink>
          </div>
        </div>
      </section>
    </main>
  );
}
