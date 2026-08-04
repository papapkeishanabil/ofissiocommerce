import Link from "next/link";
import { History, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import type { CustomerTrackingOrder } from "@/features/tracking/tracking.types";
import {
  calculateOrderProgress,
  fulfillmentLabel,
  mapInternalStatusToCustomerStatus,
} from "@/features/tracking/tracking-utils";
import { formatTrackingDate } from "@/features/tracking/tracking.service";
import { formatIDR } from "@/types/product";

interface OrderHistoryListProps {
  orders: CustomerTrackingOrder[];
}

export function OrderHistoryList({ orders }: OrderHistoryListProps) {
  if (orders.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-line bg-surface px-4 py-6 text-sm text-ink-muted">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-muted text-ink-subtle">
          <History className="h-4 w-4" />
        </span>
        Belum ada order history.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-soft-sm">
      {orders.map((order) => {
        const status = mapInternalStatusToCustomerStatus(
          order.fulfillmentType,
          order.currentStageId,
          order.paymentStatus,
        );
        const done = calculateOrderProgress(order.productionTimeline) >= 100;
        return (
          <li
            key={order.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-muted/60"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-muted text-ink-subtle">
                <History className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <Link
                  href={`/orders/${order.id}`}
                  className="font-bold text-ink hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                >
                  {order.orderNumber}
                </Link>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {formatTrackingDate(order.orderDate)} - {formatIDR(order.total)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{fulfillmentLabel(order.fulfillmentType)}</Badge>
              <Badge tone={done ? "success" : "amber"}>{status}</Badge>
              <Link
                href={`/orders/${order.id}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-3 text-xs font-semibold text-ink transition hover:border-brand-700 hover:text-brand-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Pesan ulang
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
