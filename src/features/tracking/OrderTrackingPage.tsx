"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";
import { useAuth } from "@/hooks/use-auth";
import { useOfistantStore } from "@/stores/ofistant-store";
import account from "@/features/dashboard/components/DashboardOverview.module.css";
import styles from "./OrderTrackingPage.module.css";
import { customerWhatsappHref } from "@/lib/customer-support";
import { getCustomerOrderStages } from "./customer-order-stages";

import { CustomerActionRequired } from "./components/CustomerActionRequired";
import { CustomerPaymentPanel } from "./components/CustomerPaymentPanel";
import { OrderDocuments } from "./components/OrderDocuments";
import { OrderItemProgressList } from "./components/OrderItemProgressList";
import { OrderStageStepper } from "./components/OrderStageStepper";
import { RepeatOrderButton } from "./components/RepeatOrderButton";
import { ShipmentTrackingCard } from "./components/ShipmentTrackingCard";
import {
  cacheClientTrackingOrders,
  formatTrackingDate,
  getTrackingOrder,
} from "./tracking.service";
import type { CustomerTrackingOrder } from "./tracking.types";
import { fulfillmentLabel } from "./tracking-utils";

interface OrderTrackingPageProps {
  id: string;
}

export function OrderTrackingPage({ id }: OrderTrackingPageProps) {
  const { session, hydrated } = useAuth();
  const setOfistantContext = useOfistantStore((s) => s.setContext);
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
  // A previous response must not survive a company or order navigation change.
  const matchingServerOrder =
    serverOrder && serverOrder.companyId === session?.company.id &&
    [serverOrder.id.toLowerCase(), serverOrder.orderNumber.toLowerCase()].includes(id.toLowerCase())
      ? serverOrder
      : null;
  const order = matchingServerOrder ?? localOrder;

  useEffect(() => {
    setOfistantContext({
      companyId: session?.company.id ?? null,
      companyName: session?.company.companyName ?? null,
      currentOrderId: id,
    });
    return () => {
      useOfistantStore.getState().setContext({ currentOrderId: null });
    };
  }, [
    id,
    session?.company.companyName,
    session?.company.id,
    setOfistantContext,
  ]);

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
      <div className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-cool-200" />
        <div className="mt-6 h-72 animate-pulse rounded-2xl bg-cool-100" />
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

  const requiredActions = order.actionRequired.filter((action) => action.required && !["REPEAT_ORDER", "CONTACT_SALES"].includes(action.type));
  const whatsappHref = customerWhatsappHref(order.orderNumber);

  return (
    <div className={`${account.detailPage} ${styles.page}`}>
      <Link href="/dashboard?view=orders" className={styles.back}>
        <ArrowLeft className="h-4 w-4" /> Semua pesanan
      </Link>
      <div className={styles.overview}>
        <header className={styles.identity}>
          <div className="min-w-0">
            <h1>{order.orderNumber}</h1>
            <p>{order.companyName} · {formatTrackingDate(order.orderDate)}</p>
            <div className={styles.metadata}>
              <span>{fulfillmentLabel(order.fulfillmentType)}</span>
              {order.estimatedCompletionDate ? <span>Estimasi selesai {formatTrackingDate(order.estimatedCompletionDate)}</span> : null}
            </div>
          </div>
          <div className={styles.repeat}><RepeatOrderButton order={order} compact /></div>
        </header>
        <CustomerPaymentPanel key={order.id} orderId={order.id} companyId={session?.company.id} userId={session?.user.id} layout="strip" orderTotal={order.total} />
        <OrderStageStepper stages={getCustomerOrderStages(order)} />
      </div>
      {requiredActions.length ? <CustomerActionRequired order={{ ...order, actionRequired: requiredActions }} /> : null}
      <OrderItemProgressList items={order.items} />
      <div className={styles.details}>
        <ShipmentTrackingCard order={order} />
        <OrderDocuments orderId={order.id} documents={order.documents} />
      </div>
      <div className={styles.help}>
        <p>Butuh bantuan dengan pesanan ini?</p>
        <div className="flex flex-wrap items-center gap-5">
          {whatsappHref ? <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">Chat WhatsApp Ofissio <ArrowUpRight className="h-4 w-4" /></a> : null}
          <a href="mailto:sales@ofissio.com">Email Ofissio</a>
        </div>
      </div>
    </div>
  );
}
