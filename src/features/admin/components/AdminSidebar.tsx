"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  Boxes,
  Building2,
  CircleDollarSign,
  FileArchive,
  Home,
  ListChecks,
  PackageCheck,
  PackageSearch,
  Tags,
  Truck,
  Workflow,
} from "lucide-react";

import { ADMIN_NAV_ITEMS } from "../admin.config";
import { cn } from "@/lib/utils";
import { useAdminNotifications } from "@/features/admin-notifications/components/AdminNotificationProvider";

const ICONS = {
  "/admin": Home,
  "/admin/products": PackageSearch,
  "/admin/pricing/embroidery": CircleDollarSign,
  "/admin/quotations": ListChecks,
  "/admin/orders": PackageCheck,
  "/admin/notifications": Bell,
  "/admin/process-orders": Workflow,
  "/admin/shipments": Truck,
  "/admin/customers": Building2,
  "/admin/catalog": Tags,
  "/admin/uploads": FileArchive,
  "/admin/tracking": Boxes,
  "/admin/audit": Activity,
};

export function AdminSidebar() {
  const pathname = usePathname();
  const { summary } = useAdminNotifications();
  return (
    <aside className="relative z-30 shrink-0 border-b border-line bg-white text-ink shadow-soft-sm lg:sticky lg:top-0 lg:flex lg:h-screen lg:max-h-screen lg:w-80 lg:self-start lg:flex-col lg:border-b-0 lg:border-r">
      <div className="relative flex shrink-0 items-center justify-between gap-3 px-4 py-4 lg:block lg:px-5 lg:py-6">
        <Link
          href="/admin"
          className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
        >
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-700 text-base font-extrabold text-white shadow-soft-xs">
            O
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight text-ink">
              Ofissio Admin
            </span>
            <span className="block text-xs font-medium text-ink-subtle">
              Harmas operations suite
            </span>
          </span>
        </Link>
        <div className="mt-5 hidden rounded-lg border border-line bg-slate-50 p-4 text-sm text-ink-muted lg:block">
          <p className="font-bold text-ink">Live staging console</p>
          <p className="mt-1 text-xs leading-5">
            Kelola quotation, order routing, process order, upload, tracking, dan audit dalam satu workspace.
          </p>
        </div>
      </div>
      <nav
        aria-label="Navigasi admin"
        className="relative flex gap-1.5 overflow-x-auto px-3 pb-4 lg:block lg:min-h-0 lg:flex-1 lg:space-y-0.5 lg:overflow-y-auto lg:overflow-x-hidden lg:px-3 lg:pr-4"
      >
        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.href] ?? Home;
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex min-w-max items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-[15px] font-medium text-ink-muted transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 lg:min-w-0",
                active && "bg-brand-50 font-semibold !text-brand-700",
                !active && "hover:bg-slate-100 hover:text-ink",
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-md transition",
                  active
                    ? "bg-brand-100 !text-brand-700"
                    : "bg-slate-100 text-ink-subtle group-hover:bg-slate-200 group-hover:text-ink",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>{item.label}</span>
              {item.href === "/admin/orders" && summary.ordersUnread > 0 ? (
                <span className="ml-auto min-w-6 rounded-full bg-red-600 px-2 py-0.5 text-center text-[11px] font-bold text-white">
                  {summary.ordersUnread > 99 ? "99+" : summary.ordersUnread}
                </span>
              ) : null}
              {item.href === "/admin/notifications" && summary.totalUnread > 0 ? (
                <span className="ml-auto min-w-6 rounded-full bg-brand-100 px-2 py-0.5 text-center text-[11px] font-bold text-brand-700">
                  {summary.totalUnread > 99 ? "99+" : summary.totalUnread}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="relative hidden shrink-0 px-5 pb-6 pt-4 lg:block">
        <div className="rounded-lg border border-line bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-subtle">
            Environment
          </p>
          <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Staging-ready
          </div>
        </div>
      </div>
    </aside>
  );
}
