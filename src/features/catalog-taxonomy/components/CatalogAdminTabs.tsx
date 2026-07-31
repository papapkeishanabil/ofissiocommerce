import Link from "next/link";
import { ListTree, SlidersHorizontal, Warehouse } from "lucide-react";

const TABS = [
  {
    href: "/admin/catalog/categories",
    label: "Product categories",
    icon: ListTree,
  },
  {
    href: "/admin/catalog/industries",
    label: "Industry master",
    icon: Warehouse,
  },
  {
    href: "/admin/catalog/attributes",
    label: "Product attributes",
    icon: SlidersHorizontal,
  },
] as const;

export function CatalogAdminTabs({ active }: { active: string }) {
  return (
    <nav
      aria-label="Catalog foundation"
      className="flex gap-2 overflow-x-auto rounded-2xl border border-line/80 bg-white/80 p-1.5 shadow-soft-xs"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const selected = active === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={selected ? "page" : undefined}
            className={
              selected
                ? "inline-flex min-h-11 min-w-max items-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-bold text-white shadow-soft-sm"
                : "inline-flex min-h-11 min-w-max items-center gap-2 rounded-xl px-4 text-sm font-bold text-ink-muted transition hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            }
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
