"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Boxes,
  Building2,
  FileArchive,
  Home,
  ListChecks,
  PackageCheck,
  Workflow,
} from "lucide-react";

import { ADMIN_NAV_ITEMS } from "../admin.config";
import { cn } from "@/lib/utils";

const ICONS = {
  "/admin": Home,
  "/admin/quotations": ListChecks,
  "/admin/orders": PackageCheck,
  "/admin/process-orders": Workflow,
  "/admin/customers": Building2,
  "/admin/uploads": FileArchive,
  "/admin/tracking": Boxes,
  "/admin/audit": Activity,
};

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="relative z-30 shrink-0 border-b border-white/10 bg-brand-950 text-white shadow-soft-lg lg:h-dvh lg:w-80 lg:border-b-0 lg:border-r lg:border-white/10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(74,107,216,0.35),transparent_18rem),radial-gradient(circle_at_100%_25%,rgba(232,169,42,0.18),transparent_16rem)]"
      />
      <div className="relative flex items-center justify-between gap-3 px-4 py-4 lg:block lg:px-5 lg:py-6">
        <Link
          href="/admin"
          className="flex items-center gap-3 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-lg font-black text-brand-800 shadow-glow-brand">
            O
          </span>
          <span>
            <span className="block text-lg font-black tracking-tight">Ofissio Admin</span>
            <span className="block text-xs font-semibold text-white/60">
              Harmas operations suite
            </span>
          </span>
        </Link>
        <div className="mt-5 hidden rounded-3xl border border-white/10 bg-white/[0.08] p-4 text-sm text-white/70 lg:block">
          <p className="font-black text-white">Live staging console</p>
          <p className="mt-1 text-xs leading-5">
            Kelola quotation, order routing, process order, upload, tracking, dan audit dalam satu workspace.
          </p>
        </div>
      </div>
      <nav
        aria-label="Navigasi admin"
        className="relative flex gap-2 overflow-x-auto px-4 pb-4 lg:block lg:space-y-1.5 lg:overflow-y-auto lg:overflow-x-hidden lg:px-3 lg:pr-4"
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
                "group flex min-w-max items-center gap-3 rounded-2xl border border-transparent px-3.5 py-3 text-sm font-bold text-white/72 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:min-w-0",
                active &&
                  "border-white/15 bg-gradient-to-r from-brand-700 to-brand-500 !text-white shadow-glow-brand",
                !active && "hover:border-white/10 hover:bg-white/10 hover:text-white",
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-xl transition",
                  active
                    ? "bg-white/15 !text-white"
                    : "bg-white/[0.08] text-white/70 group-hover:bg-white/15 group-hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="relative hidden px-5 pb-6 pt-4 lg:block">
        <div className="rounded-3xl border border-white/10 bg-white/[0.08] p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/50">
            Environment
          </p>
          <div className="mt-3 flex items-center gap-2 text-sm font-black text-white">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_5px_rgba(52,211,153,0.14)]" />
            Staging-ready
          </div>
        </div>
      </div>
    </aside>
  );
}
