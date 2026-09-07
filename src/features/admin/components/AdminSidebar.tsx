"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  BookOpen,
  Boxes,
  Building2,
  CircleDollarSign,
  FileArchive,
  FileText,
  ReceiptText,
  Home,
  ListChecks,
  ListOrdered,
  Mail,
  MessagesSquare,
  PackageCheck,
  PackageSearch,
  Tags,
  Percent,
  TicketPercent,
  Truck,
  Workflow,
  Waypoints,
  Users,
} from "lucide-react";

import { ADMIN_NAV_ITEMS, ADMIN_ROLE_PERMISSIONS } from "../admin.config";
import { cn } from "@/lib/utils";
import { useAdminNotifications } from "@/features/admin-notifications/components/AdminNotificationProvider";
import type { InternalAdminUser } from "../admin.types";

const ICONS = {
  "/admin": Home,
  "/admin/help": BookOpen,
  "/admin/products": PackageSearch,
  "/admin/pricing/embroidery": CircleDollarSign,
  "/admin/settings/moq": ListOrdered,
  "/admin/promotions": TicketPercent,
  "/admin/site-content": FileText,
  "/admin/ofistant-knowledge": BookOpen,
  "/admin/settings/tax": Percent,
  "/admin/settings/shipping": Truck,
  "/admin/requests": MessagesSquare,
  "/admin/quotations": ListChecks,
  "/admin/orders": PackageCheck,
  "/admin/invoices": ReceiptText,
  "/admin/notifications": Bell,
  "/admin/settings/email": Mail,
  "/admin/process-orders": Workflow,
  "/admin/shipments": Truck,
  "/admin/customers": Building2,
  "/admin/catalog": Tags,
  "/admin/uploads": FileArchive,
  "/admin/tracking": Boxes,
  "/admin/integrations/ginee": Waypoints,
  "/admin/audit": Activity,
  "/admin/users": Users,
};

const NAV_GROUPS = [
  { label: "Overview", hrefs: ["/admin", "/admin/help", "/admin/products", "/admin/pricing/embroidery", "/admin/settings/moq", "/admin/promotions", "/admin/site-content", "/admin/settings/tax", "/admin/settings/shipping"] },
  { label: "Sales & order", hrefs: ["/admin/requests", "/admin/quotations", "/admin/orders", "/admin/invoices", "/admin/customers"] },
  { label: "Production", hrefs: ["/admin/process-orders", "/admin/shipments", "/admin/tracking", "/admin/uploads"] },
  { label: "Master & system", hrefs: ["/admin/catalog", "/admin/ofistant-knowledge", "/admin/users", "/admin/notifications", "/admin/settings/email", "/admin/integrations/ginee", "/admin/audit"] },
] as const;

export function AdminSidebar({ user }: { user: InternalAdminUser }) {
  const pathname = usePathname();
  const { summary } = useAdminNotifications();
  return (
    <aside className="relative z-30 shrink-0 border-b border-white/10 bg-gradient-to-br from-[#0b2861] to-[#061a45] text-white shadow-[0_18px_45px_rgba(7,26,58,0.16)] lg:sticky lg:top-2 lg:flex lg:h-[calc(100vh-1rem)] lg:max-h-[calc(100vh-1rem)] lg:w-[212px] lg:self-start lg:flex-col lg:rounded-2xl lg:border-0">
      <div className="relative flex shrink-0 items-center justify-between gap-3 px-4 py-4 lg:block lg:px-4 lg:py-5">
        <Link
          href="/admin"
          className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-base font-extrabold text-brand-900 shadow-[0_10px_24px_rgba(0,16,56,0.35)]">
            O
          </span>
          <span>
            <span className="block text-base font-bold tracking-[-0.025em] text-white">
              Ofissio Admin
            </span>
            <span className="block text-[10px] font-medium text-blue-200/70">
              Operations control
            </span>
          </span>
        </Link>
        <div className="mt-4 hidden rounded-xl border border-white/10 bg-white/[0.06] p-3 lg:block">
          <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-blue-200/60">Active workspace</p>
          <p className="mt-1 text-xs font-semibold text-white">Harmas Operations</p>
        </div>
      </div>
      <nav
        aria-label="Navigasi admin"
        className="relative flex gap-1 overflow-x-auto px-3 pb-4 lg:block lg:min-h-0 lg:flex-1 lg:space-y-0.5 lg:overflow-y-auto lg:overflow-x-hidden lg:px-2"
      >
        {NAV_GROUPS.map((group) => {
          const items = ADMIN_NAV_ITEMS.filter((item) => group.hrefs.some((href) => href === item.href));
          const visibleItems = items.filter((item) => ADMIN_ROLE_PERMISSIONS[user.role]?.includes(item.permission));
          if (!visibleItems.length) return null;
          return <div key={group.label} className="lg:mb-2">
            <p className="hidden px-3 pb-1 pt-2 text-[8px] font-bold uppercase tracking-[0.15em] text-blue-200/40 lg:block">{group.label}</p>
            {visibleItems.map((item) => {
          if (!ADMIN_ROLE_PERMISSIONS[user.role]?.includes(item.permission)) return null;
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
                "group flex min-w-max items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-xs font-semibold text-blue-100/70 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:min-w-0",
                active && "bg-white !text-brand-900 shadow-[0_10px_28px_rgba(0,16,56,0.28)]",
                !active && "hover:bg-white/[0.08] hover:text-white",
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-lg transition",
                  active
                    ? "bg-brand-50 !text-brand-700"
                    : "bg-white/[0.07] text-blue-100/70 group-hover:text-white",
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
              {item.href === "/admin/quotations" && summary.officialQuotationsUnread > 0 ? (
                <span className="ml-auto min-w-6 rounded-full bg-red-600 px-2 py-0.5 text-center text-[11px] font-bold text-white">
                  {summary.officialQuotationsUnread > 99 ? "99+" : summary.officialQuotationsUnread}
                </span>
              ) : null}
              {item.href === "/admin/requests" && summary.requestsUnread > 0 ? (
                <span className="ml-auto min-w-6 rounded-full bg-red-600 px-2 py-0.5 text-center text-[11px] font-bold text-white">
                  {summary.requestsUnread > 99 ? "99+" : summary.requestsUnread}
                </span>
              ) : null}
              {item.href === "/admin/process-orders" && summary.workOrdersUnread > 0 ? (
                <span className="ml-auto min-w-6 rounded-full bg-red-600 px-2 py-0.5 text-center text-[11px] font-bold text-white">
                  {summary.workOrdersUnread > 99 ? "99+" : summary.workOrdersUnread}
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
          </div>;
        })}
      </nav>
      <div className="relative hidden shrink-0 px-3 pb-4 pt-3 lg:block">
        <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-blue-200/60">
            Environment
          </p>
          <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-white">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Staging-ready
          </div>
        </div>
      </div>
    </aside>
  );
}
