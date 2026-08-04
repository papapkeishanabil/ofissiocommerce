import { Factory, PackageCheck, Scissors, type LucideIcon } from "lucide-react";

import type { OrderProcessRoute } from "@/features/orders/order.types";
import { cn } from "@/lib/utils";

const ROUTE_APPEARANCE: Record<
  OrderProcessRoute,
  {
    label: string;
    description: string;
    Icon: LucideIcon;
    className: string;
    iconClassName: string;
  }
> = {
  fulfillment: {
    label: "Fulfillment",
    description: "Picking, packing & shipping",
    Icon: PackageCheck,
    className: "bg-sky-50 text-sky-900 ring-sky-200",
    iconClassName: "bg-sky-700 text-white",
  },
  customization: {
    label: "Customization",
    description: "Bordir, sablon & custom ringan",
    Icon: Scissors,
    className: "bg-violet-50 text-violet-900 ring-violet-200",
    iconClassName: "bg-violet-700 text-white",
  },
  production: {
    label: "Production",
    description: "Produksi khusus & SPK",
    Icon: Factory,
    className: "bg-amber-50 text-amber-950 ring-amber-200",
    iconClassName: "bg-amber-600 text-white",
  },
};

export function AdminProcessRouteBadge({
  route,
  showDescription = false,
  className,
}: {
  route: OrderProcessRoute;
  showDescription?: boolean;
  className?: string;
}) {
  const appearance = ROUTE_APPEARANCE[route];
  const Icon = appearance.Icon;

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-lg px-2.5 py-1.5 ring-1",
        appearance.className,
        className,
      )}
    >
      <span
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center rounded-md",
          appearance.iconClassName,
        )}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-extrabold uppercase tracking-[0.055em]">
          {appearance.label}
        </span>
        {showDescription ? (
          <span className="mt-0.5 block text-[11px] font-medium normal-case tracking-normal opacity-80">
            {appearance.description}
          </span>
        ) : null}
      </span>
    </span>
  );
}

export function AdminProcessRouteLegend() {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Keterangan jenis process routing">
      {(Object.keys(ROUTE_APPEARANCE) as OrderProcessRoute[]).map((route) => (
        <AdminProcessRouteBadge key={route} route={route} showDescription />
      ))}
    </div>
  );
}
