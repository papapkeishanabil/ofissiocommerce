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
import { cacheClientTrackingOrders } from "@/features/tracking/tracking.service";
import type { CustomerTrackingOrder } from "@/features/tracking/tracking.types";
import { useAuth } from "@/hooks/use-auth";
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
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const { session, hydrated } = useAuth();

  const scopedQuery = useCallback(() => {
    const params = new URLSearchParams({ paymentId });
    if (session?.company.id) params.set("companyId", session.company.id);
    if (session?.user.id) params.set("userId", session.user.id);
    return params.toString();
  }, [paymentId, session?.company.id, session?.user.id]);

  const trackingScopeQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (session?.company.id) params.set("companyId", session.company.id);
    if (session?.user.id) params.set("userId", session.user.id);
    if (session?.company.companyName) {
      params.set("companyName", session.company.companyName);
    }
    return params.toString();
  }, [
    session?.company.companyName,
    session?.company.id,
    session?.user.id,
  ]);

  const cacheTrackingOrder = useCallback(
    async (orderId: string) => {
      try {
        const response = await fetch(
          `/api/tracking/orders/${encodeURIComponent(orderId)}?${trackingScopeQuery()}`,
          { cache: "no-store" },
        );
        const result = (await response.json()) as {
          ok: boolean;
          order?: CustomerTrackingOrder;
        };
        if (!response.ok || !result.order) return;
        cacheClientTrackingOrders([result.order]);
        setTrackingOrderId(result.order.id);
      } catch {
        // Tracking remains available through dashboard API; cache is best effort.
      }
    },
    [trackingScopeQuery],
  );

  const loadStatus = useCallback(async () => {
    if (!paymentId || !hydrated) {
      setMessage("Status pembayaran belum dapat diverifikasi.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(
        `/api/payment/status?${scopedQuery()}`,
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
      if (result.payment.status === "paid") {
        void cacheTrackingOrder(result.payment.orderId);
      }
      setMessage(null);
    } catch {
      setMessage("Status pembayaran belum dapat diverifikasi.");
    } finally {
      setLoading(false);
    }
  }, [cacheTrackingOrder, hydrated, paymentId, scopedQuery]);

  useEffect(() => {
    if (!hydrated) return;
    void loadStatus();
  }, [hydrated, loadStatus]);

  async function simulate(status: "paid" | "failed") {
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/payment/mock/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId,
          status,
          companyId: session?.company.id,
          userId: session?.user.id,
        }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        payment?: PaymentStatusView;
        tracking?: CustomerTrackingOrder | null;
        message?: string;
      };
      if (!response.ok || !result.payment) {
        throw new Error(result.message);
      }
      setPayment(result.payment);
      if (result.tracking) {
        cacheClientTrackingOrders([result.tracking]);
        setTrackingOrderId(result.tracking.id);
      } else if (result.payment.status === "paid") {
        await cacheTrackingOrder(result.payment.orderId);
      }
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
            {(trackingOrderId ?? (paid ? payment?.orderId : null)) && (
              <ButtonLink
                href={`/orders/${trackingOrderId ?? payment!.orderId}`}
                variant="outline"
              >
                Buka tracking order
              </ButtonLink>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
