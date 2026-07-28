import Image from "next/image";
import { Shirt } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import type { OrderItemProgress } from "@/features/tracking/tracking.types";
import {
  calculateItemProgress,
  summarizeSizeMatrix,
} from "@/features/tracking/tracking-utils";
import { zoneLabel } from "@/types/uniform-3d";
import { formatIDR } from "@/types/product";

interface OrderItemProgressListProps {
  items: OrderItemProgress[];
}

export function OrderItemProgressList({ items }: OrderItemProgressListProps) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-sm font-bold text-ink">Item order</h2>
      <ul className="mt-4 space-y-3">
        {items.map((item) => {
          const progress = calculateItemProgress(item);
          return (
            <li
              key={item.id}
              className="grid grid-cols-1 gap-4 rounded-xl border border-line p-3 sm:grid-cols-[96px_minmax(0,1fr)]"
            >
              <div className="relative aspect-square overflow-hidden rounded-xl bg-surface-muted">
                {item.snapshotUrl ? (
                  <Image
                    src={item.snapshotUrl}
                    alt={`Snapshot ${item.productName}`}
                    fill
                    className="object-contain p-2"
                    sizes="96px"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-brand-200">
                    <Shirt className="h-9 w-9" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink">{item.productName}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {item.selectedColor} - {item.totalQty} pcs -{" "}
                      {formatIDR(item.estimatedPrice)}
                    </p>
                  </div>
                  <Badge tone="brand">{progress}%</Badge>
                </div>

                <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <Summary label="Size matrix" value={summarizeSizeMatrix(item.sizeMatrix)} />
                  <Summary
                    label="Bordir"
                    value={
                      item.embroideryPlacements.length
                        ? item.embroideryPlacements
                            .map((placement) => zoneLabel(placement.zone))
                            .join(", ")
                        : "Tidak ada"
                    }
                  />
                  <Summary label="Logo" value={item.logoFilename ?? "Placeholder"} />
                  <Summary label="Catatan" value={item.notes ?? "-"} />
                  <Summary label="Model 3D ID" value={item.model3dId ?? "-"} />
                  <Summary label="Model 3D URL" value={item.model3dUrl ?? "-"} />
                </dl>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-muted px-2.5 py-2">
      <dt className="font-semibold text-ink-muted">{label}</dt>
      <dd className="mt-0.5 line-clamp-2 text-ink">{value || "-"}</dd>
    </div>
  );
}
