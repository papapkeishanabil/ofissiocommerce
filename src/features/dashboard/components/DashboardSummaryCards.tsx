import Link from "next/link";
import type { ReactNode } from "react";
import { FileText, MapPin, PackageCheck, ShoppingCart } from "lucide-react";

interface DashboardSummaryCardsProps {
  cartCount: number | string;
  activeOrderCount: number;
  quotationCount: number;
  addressCount: number;
}

export function DashboardSummaryCards({
  cartCount,
  activeOrderCount,
  quotationCount,
  addressCount,
}: DashboardSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <SummaryCard
        href="/cart"
        icon={<ShoppingCart className="h-4 w-4" />}
        label="Item di cart"
        value={String(cartCount)}
      />
      <SummaryCard
        href="#active-orders"
        icon={<PackageCheck className="h-4 w-4" />}
        label="Active orders"
        value={String(activeOrderCount)}
      />
      <SummaryCard
        href="#quotations"
        icon={<FileText className="h-4 w-4" />}
        label="Quotation"
        value={String(quotationCount)}
      />
      <SummaryCard
        href="/dashboard/addresses"
        icon={<MapPin className="h-4 w-4" />}
        label="Alamat"
        value={String(addressCount)}
      />
    </div>
  );
}

function SummaryCard({
  href,
  icon,
  label,
  value,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-line bg-surface p-4 shadow-soft-xs transition hover:border-brand-300 hover:bg-brand-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
    >
      <span className="text-brand-700">{icon}</span>
      <span className="mt-2 block text-2xl font-bold text-ink">{value}</span>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
        {label}
      </span>
    </Link>
  );
}
