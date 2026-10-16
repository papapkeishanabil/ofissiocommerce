"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { CustomerTrackingOrder } from "@/features/tracking/tracking.types";
export function useUnpaidOrders() {
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

  return { scope, authenticated: !!scope, loading: !hydrated || (!!scope && result?.scope !== scope), error: !!scope && result?.scope === scope && result.error, orders: scope && result?.scope === scope ? result.orders : [] };
}
