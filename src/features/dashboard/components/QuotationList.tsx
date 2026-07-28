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
      <div className="rounded-2xl border border-dashed border-line bg-surface px-4 py-6 text-center text-sm text-ink-muted">
        Belum ada quotation.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {quotations.map((quotation) => {
        const progress = calculateOrderProgress(quotation.timeline);
        return (
          <li
            key={quotation.id}
            className="rounded-2xl border border-line bg-surface p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-bold text-ink">
                  <FileClock className="h-4 w-4 text-brand-700" />
                  {quotation.quotationNumber}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {quotation.items.length} item - submitted{" "}
                  {formatTrackingDate(quotation.submittedAt)}
                </p>
              </div>
              <Badge tone="brand">{STATUS_LABEL[quotation.status]}</Badge>
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-ink">
                  {quotation.timeline.find((s) => s.state === "current")?.label ??
                    "Quotation"}
                </span>
                <span className="font-bold text-brand-700">{progress}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-ochre-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <Link
              href="/quote"
              className="mt-3 inline-flex h-9 items-center rounded-full border border-line-strong px-3 text-xs font-semibold text-ink transition hover:border-brand-700 hover:text-brand-700"
            >
              Lihat quotation
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
