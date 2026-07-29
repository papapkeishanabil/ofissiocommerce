import { Gauge, PackageCheck } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import type { CustomerTrackingOrder } from "@/features/tracking/tracking.types";
import {
  calculateOrderProgress,
  fulfillmentLabel,
  paymentStatusLabel,
  trackingOrderStatusLabel,
} from "@/features/tracking/tracking-utils";
import { formatTrackingDate } from "@/features/tracking/tracking.service";

interface ProductionProgressCardProps {
  order: CustomerTrackingOrder;
}

export function ProductionProgressCard({ order }: ProductionProgressCardProps) {
  const progress = calculateOrderProgress(order.productionTimeline);
  const status = trackingOrderStatusLabel(order);

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="type-eyebrow text-brand-700">Current Status</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">{status}</h2>
          <p className="mt-1 text-sm text-ink-muted">{order.statusNote}</p>
          {order.nextStep && (
            <p className="mt-2 text-sm font-semibold text-brand-700">
              Tahap berikutnya: {order.nextStep}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">{fulfillmentLabel(order.fulfillmentType)}</Badge>
          <Badge tone={order.paymentStatus === "failed" ? "warning" : "success"}>
            {paymentStatusLabel(order.paymentStatus)}
          </Badge>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-semibold text-ink">
            <Gauge className="h-4 w-4 text-brand-700" />
            Progress otomatis
          </span>
          <span className="text-xl font-bold text-brand-700">{progress}%</span>
        </div>
        <div
          className="h-3 overflow-hidden rounded-full bg-slate-100"
          aria-label={`Progress order ${progress}%`}
        >
          <div
            className="h-full rounded-full bg-brand-700 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <Info
          label="Estimasi selesai"
          value={formatTrackingDate(order.estimatedCompletionDate)}
        />
        <Info
          label="Estimasi kirim"
          value={formatTrackingDate(order.estimatedDeliveryDate)}
        />
        <Info label="Jumlah item" value={`${order.items.length} item`} />
        <Info
          label="Total qty"
          value={`${order.items.reduce((sum, item) => sum + item.totalQty, 0)} pcs`}
        />
      </dl>

      <p className="mt-4 flex items-start gap-2 rounded-xl bg-brand-50 px-3 py-2 text-xs leading-relaxed text-brand-800">
        <PackageCheck className="mt-0.5 h-4 w-4 shrink-0" />
        Progress dihitung dari bobot stage dan qty selesai pada stage berjalan, bukan input manual persentase.
      </p>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-muted px-3 py-2">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
        {label}
      </dt>
      <dd className="mt-1 font-bold text-ink">{value}</dd>
    </div>
  );
}
