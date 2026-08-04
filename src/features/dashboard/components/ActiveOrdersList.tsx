import Link from "next/link";
import { ArrowRight, PackageSearch } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import type { CustomerTrackingOrder } from "@/features/tracking/tracking.types";
import {
  calculateOrderProgress,
  fulfillmentLabel,
  mapInternalStatusToCustomerStatus,
  paymentStatusLabel,
} from "@/features/tracking/tracking-utils";
import { formatTrackingDate } from "@/features/tracking/tracking.service";
import { formatIDR } from "@/types/product";

interface ActiveOrdersListProps {
  orders: CustomerTrackingOrder[];
}

export function ActiveOrdersList({ orders }: ActiveOrdersListProps) {
  if (orders.length === 0) {
    return (
      <EmptyState
        title="Belum ada active order"
        description="Order yang sudah checkout atau masuk produksi akan tampil di sini."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {orders.map((order, index) => {
        const progress = calculateOrderProgress(order.productionTimeline);
        const status = mapInternalStatusToCustomerStatus(
          order.fulfillmentType,
          order.currentStageId,
          order.paymentStatus,
        );
        return (
          <li
            key={order.id}
            style={{ animationDelay: `${index * 60}ms` }}
            className="hover-lift animate-fade-in-up rounded-2xl border border-line bg-surface p-4 shadow-soft-sm hover:border-brand-200"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <PackageSearch className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/orders/${order.id}`}
                      className="font-bold text-ink hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                    >
                      {order.orderNumber}
                    </Link>
                    <Badge tone="brand">{fulfillmentLabel(order.fulfillmentType)}</Badge>
                    <Badge tone={order.paymentStatus === "failed" ? "warning" : "success"}>
                      {paymentStatusLabel(order.paymentStatus)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {order.items.length} item - {formatIDR(order.total)}
                  </p>
                </div>
              </div>

              <ButtonLink href={`/orders/${order.id}`} size="sm" variant="outline">
                Lihat Tracking
                <ArrowRight className="h-3.5 w-3.5" />
              </ButtonLink>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-ink">{status}</span>
                <span className="font-bold text-brand-700">{progress}%</span>
              </div>
              <div
                className="mt-2 h-2.5 overflow-hidden rounded-full bg-brand-50"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progress ${progress}%`}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-[width] duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted">
                <span>Selesai: {formatTrackingDate(order.estimatedCompletionDate)}</span>
                <span>Kirim: {formatTrackingDate(order.estimatedDeliveryDate)}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface px-4 py-10 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-300">
        <PackageSearch className="h-6 w-6" />
      </span>
      <p className="mt-3 text-sm font-bold text-ink">{title}</p>
      <p className="mt-1 text-xs text-ink-muted">{description}</p>
      <ButtonLink href="/catalog" size="sm" variant="ghost" className="mt-4">
        Lihat katalog
      </ButtonLink>
    </div>
  );
}
