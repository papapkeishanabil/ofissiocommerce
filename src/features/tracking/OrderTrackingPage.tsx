"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, ReceiptText, Truck } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { useAuth } from "@/hooks/use-auth";
import { formatIDR } from "@/types/product";

import { CustomerActionRequired } from "./components/CustomerActionRequired";
import { OrderDocuments } from "./components/OrderDocuments";
import { OrderItemProgressList } from "./components/OrderItemProgressList";
import { OrderStatusTimeline } from "./components/OrderStatusTimeline";
import { ProductionProgressCard } from "./components/ProductionProgressCard";
import { RepeatOrderButton } from "./components/RepeatOrderButton";
import { ShipmentTrackingCard } from "./components/ShipmentTrackingCard";
import {
  cacheClientTrackingOrders,
  formatTrackingDate,
  getTrackingOrder,
} from "./tracking.service";
import type { CustomerTrackingOrder } from "./tracking.types";
import {
  calculateOrderProgress,
  fulfillmentLabel,
  mapInternalStatusToCustomerStatus,
  paymentStatusLabel,
} from "./tracking-utils";

interface OrderTrackingPageProps {
  id: string;
}

export function OrderTrackingPage({ id }: OrderTrackingPageProps) {
  const { session, hydrated } = useAuth();
  const [serverOrder, setServerOrder] = useState<CustomerTrackingOrder | null>(
    null,
  );
  const [fetchingOrder, setFetchingOrder] = useState(true);
  const localOrder = useMemo(
    () =>
      getTrackingOrder(id, {
        companyId: session?.company.id,
        companyName: session?.company.companyName,
      }),
    [id, session?.company.companyName, session?.company.id],
  );
  const order = serverOrder ?? localOrder;

  useEffect(() => {
    if (!hydrated) return;
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (session?.company.id) params.set("companyId", session.company.id);
    if (session?.user.id) params.set("userId", session.user.id);
    if (session?.company.companyName) {
      params.set("companyName", session.company.companyName);
    }

    async function loadOrder() {
      setFetchingOrder(true);
      try {
        const response = await fetch(
          `/api/tracking/orders/${encodeURIComponent(id)}?${params}`,
          { cache: "no-store", signal: controller.signal },
        );
        const result = (await response.json()) as {
          ok: boolean;
          order?: CustomerTrackingOrder;
        };
        if (!response.ok || !result.ok || !result.order) return;
        setServerOrder(result.order);
        cacheClientTrackingOrders([result.order]);
      } catch {
        if (!controller.signal.aborted) setServerOrder(null);
      } finally {
        if (!controller.signal.aborted) setFetchingOrder(false);
      }
    }

    void loadOrder();
    return () => controller.abort();
  }, [hydrated, id, session?.company.companyName, session?.company.id, session?.user.id]);

  if (!hydrated || (!order && fetchingOrder)) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 lg:px-8">
        <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 h-72 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto grid w-full max-w-md place-items-center px-4 py-16 text-center">
        <h1 className="text-lg font-bold text-ink">Order tidak ditemukan</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Data tracking belum tersedia untuk order ini.
        </p>
        <ButtonLink href="/dashboard" className="mt-5">
          Kembali ke dashboard
        </ButtonLink>
      </div>
    );
  }

  const progress = calculateOrderProgress(order.productionTimeline);
  const status = mapInternalStatusToCustomerStatus(
    order.fulfillmentType,
    order.currentStageId,
    order.paymentStatus,
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
      <Link
        href="/dashboard"
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-ink-muted hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      <header className="rounded-2xl border border-line bg-surface p-5 shadow-soft-xs">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="type-eyebrow text-brand-700">Order Tracking</p>
            <h1 className="mt-2 text-2xl font-bold text-ink lg:text-3xl">
              {order.orderNumber}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {order.companyName} - {formatTrackingDate(order.orderDate)}
            </p>
          </div>
          <div className="w-full max-w-xs">
            <RepeatOrderButton order={order} />
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <HeaderStat label="Status" value={status} />
          <HeaderStat label="Progress" value={`${progress}%`} />
          <HeaderStat label="Fulfillment" value={fulfillmentLabel(order.fulfillmentType)} />
          <HeaderStat label="Pembayaran" value={paymentStatusLabel(order.paymentStatus)} />
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="brand">
            <CalendarDays className="h-3 w-3" />
            Selesai {formatTrackingDate(order.estimatedCompletionDate)}
          </Badge>
          <Badge tone="neutral">
            <ReceiptText className="h-3 w-3" />
            Total {formatIDR(order.total)}
          </Badge>
          <Badge tone={order.selectedShippingRate ? "brand" : "neutral"}>
            <Truck className="h-3 w-3" />
            {order.selectedShippingRate
              ? `${order.selectedShippingRate.courierName} ${order.selectedShippingRate.serviceName}`
              : "Ongkir belum aktif"}
          </Badge>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <ProductionProgressCard order={order} />
          <OrderItemProgressList items={order.items} />
          <OrderStatusTimeline
            title="Production timeline"
            stages={order.productionTimeline}
          />
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <ShipmentTrackingCard order={order} />
          <OrderDocuments documents={order.documents} />
          <CustomerActionRequired order={order} />
        </aside>
      </div>
    </main>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-muted px-3 py-2">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-bold text-ink">{value}</dd>
    </div>
  );
}
