"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ButtonLink } from "@/components/ui/Button";
import { formatIDR } from "@/types/product";
import type { CustomerTrackingOrder } from "@/features/tracking/tracking.types";

export function UnpaidOrders() {
  const { session, hydrated } = useAuth();
  const companyId = session?.company.id;
  const userId = session?.user.id;
  const scope = companyId && userId ? `${companyId}:${userId}` : "";
  const [result, setResult] = useState<{
    scope: string; orders: CustomerTrackingOrder[]; error: boolean;
  } | null>(null);

  useEffect(() => {
    if (!hydrated || !companyId || !userId) return;
    let controller: AbortController | null = null;
    async function load() {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const params = new URLSearchParams({ companyId: companyId!, userId: userId! });
        const response = await fetch(`/api/tracking/orders?${params}`, { cache: "no-store", signal: request.signal });
        const body = await response.json();
        if (!response.ok || body.ok !== true || !Array.isArray(body.dynamicOrders)) throw new Error("orders_unavailable");
        const orders = (body.dynamicOrders as CustomerTrackingOrder[])
          .filter((order) => order.companyId === companyId && order.paymentStatus === "waiting_payment" && order.orderStatus !== "cancelled")
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        if (!request.signal.aborted) setResult({ scope, orders, error: false });
      } catch {
        if (!request.signal.aborted) setResult({ scope, orders: [], error: true });
      }
    }
    void load();
    window.addEventListener("focus", load);
    return () => { controller?.abort(); window.removeEventListener("focus", load); };
  }, [companyId, hydrated, scope, userId]);

  if (!hydrated || !scope) return null;
  if (result?.scope !== scope) {
    return <p role="status" className="mb-5 text-sm text-ink-muted">Memeriksa pesanan yang belum dibayar…</p>;
  }
  if (result.error) {
    return <div className="mb-5 rounded-lg border border-line p-4 text-sm"><p>Pesanan belum dapat dimuat. Periksa pesanan Anda sebelum checkout kembali.</p><ButtonLink href="/dashboard?view=orders" variant="outline" size="sm" className="mt-3">Lihat pesanan saya</ButtonLink></div>;
  }
  if (!result.orders.length) return null;
  return (
    <section aria-label="Pesanan belum dibayar" className="mb-5 rounded-lg border border-ochre-300 bg-ochre-50/40 p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-ink">Pesanan belum dibayar</h2>
      <p className="mt-1 text-sm leading-6 text-ink-muted">Pesanan sudah tersimpan. Lanjutkan pembayaran dari pesanan yang sama tanpa checkout ulang.</p>
      <ul className="mt-4 divide-y divide-line">
        {result.orders.map((order) => (
          <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1 basis-52">
              <p className="break-words text-sm font-semibold">{order.orderNumber}</p>
              <p className="mt-1 text-sm text-ink-muted">{order.items.map((item) => `${item.productName} (${item.totalQty} pcs)`).join(", ")}</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">{formatIDR(order.total)}</p>
            </div>
            <ButtonLink href={`/orders/${encodeURIComponent(order.id)}`} variant="outline" size="sm">Lihat pesanan &amp; pembayaran</ButtonLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
