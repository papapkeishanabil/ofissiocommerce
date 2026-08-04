import Link from "next/link";
import { ArrowUpRight, FileText, MapPin, PackageCheck, ShoppingCart } from "lucide-react";

import { cn } from "@/lib/utils";

interface DashboardSummaryCardsProps {
  cartCount: number | string;
  activeOrderCount: number;
  quotationCount: number;
  addressCount: number;
}

type Tone = "brand" | "ochre";

const CHIP: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700",
  ochre: "bg-ochre-50 text-ochre-700",
};

export function DashboardSummaryCards({
  cartCount,
  activeOrderCount,
  quotationCount,
  addressCount,
}: DashboardSummaryCardsProps) {
  const cards = [
    {
      href: "/cart",
      icon: <ShoppingCart className="h-5 w-5" />,
      label: "Item di cart",
      value: String(cartCount),
      tone: "brand" as Tone,
    },
    {
      href: "#active-orders",
      icon: <PackageCheck className="h-5 w-5" />,
      label: "Active orders",
      value: String(activeOrderCount),
      tone: "ochre" as Tone,
    },
    {
      href: "#quotations",
      icon: <FileText className="h-5 w-5" />,
      label: "Quotation",
      value: String(quotationCount),
      tone: "brand" as Tone,
    },
    {
      href: "/dashboard/addresses",
      icon: <MapPin className="h-5 w-5" />,
      label: "Alamat",
      value: String(addressCount),
      tone: "brand" as Tone,
    },
  ];

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card, index) => (
        <SummaryCard key={card.label} {...card} index={index} />
      ))}
    </div>
  );
}

function SummaryCard({
  href,
  icon,
  label,
  value,
  tone,
  index,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: Tone;
  index: number;
}) {
  return (
    <Link
      href={href}
      style={{ animationDelay: `${60 + index * 70}ms` }}
      className="hover-lift animate-fade-in-up group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-soft-sm hover:border-brand-200 hover:shadow-soft-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "grid h-10 w-10 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-110",
            CHIP[tone],
          )}
        >
          {icon}
        </span>
        <ArrowUpRight className="h-4 w-4 text-ink-subtle opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      </div>
      <span className="mt-3 block text-2xl font-extrabold tracking-tight text-ink">
        {value}
      </span>
      <span className="text-[11px] font-bold uppercase tracking-wide text-ink-subtle">
        {label}
      </span>
    </Link>
  );
}
