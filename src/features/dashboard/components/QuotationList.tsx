import Link from "next/link";
import { FileClock } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import type { CustomerQuotationTracking } from "@/features/tracking/tracking.types";
import { calculateOrderProgress } from "@/features/tracking/tracking-utils";
import { formatTrackingDate } from "@/features/tracking/tracking.service";

interface QuotationListProps {
  quotations: CustomerQuotationTracking[];
}

const STATUS_LABEL: Record<CustomerQuotationTracking["status"], string> = {
  submitted: "Submitted",
  reviewed: "Reviewed",
  sent: "Sent",
  accepted: "Accepted",
  waiting_payment: "Waiting payment",
  paid: "Paid",
};

export function QuotationList({ quotations }: QuotationListProps) {
  if (quotations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface px-4 py-8 text-center text-sm text-ink-muted">
        Belum ada quotation.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {quotations.map((quotation, index) => {
        const progress = calculateOrderProgress(quotation.timeline);
        const currentLabel =
          quotation.timeline.find((s) => s.state === "current")?.label ??
          "Quotation";
        return (
          <li
            key={quotation.id}
            style={{ animationDelay: `${index * 60}ms` }}
            className="hover-lift animate-fade-in-up rounded-2xl border border-line bg-surface p-4 shadow-soft-sm hover:border-ochre-300/70"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ochre-50 text-ochre-700">
                  <FileClock className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-ink">{quotation.quotationNumber}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {quotation.items.length} item - submitted{" "}
                    {formatTrackingDate(quotation.submittedAt)}
                  </p>
                </div>
              </div>
              <Badge tone="brand">{STATUS_LABEL[quotation.status]}</Badge>
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-ink">{currentLabel}</span>
                <span className="font-bold text-ochre-700">{progress}%</span>
              </div>
              <div
                className="mt-2 h-2.5 overflow-hidden rounded-full bg-ochre-50"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-ochre-500 to-ochre-400 transition-[width] duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/quotes/${quotation.id}`}
                className="inline-flex h-9 items-center rounded-full border border-line-strong px-3 text-xs font-semibold text-ink transition hover:border-brand-700 hover:text-brand-700"
              >
                {quotation.status === "sent" ? "Lihat Penawaran" : "Lihat quotation"}
              </Link>
              {quotation.convertedOrderId ? (
                <Link
                  href={`/orders/${quotation.convertedOrderId}`}
                  className="inline-flex h-9 items-center rounded-full bg-brand-700 px-3 text-xs font-semibold text-white transition hover:bg-brand-800"
                >
                  Lihat order
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
