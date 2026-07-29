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
} from "lucide-react";

import { ADMIN_NAV_ITEMS } from "../admin.config";
import { cn } from "@/lib/utils";

const ICONS = {
  "/admin": Home,
  "/admin/quotations": ListChecks,
  "/admin/orders": PackageCheck,
  "/admin/customers": Building2,
  "/admin/uploads": FileArchive,
  "/admin/tracking": Boxes,
  "/admin/audit": Activity,
};

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="border-b border-line bg-ink text-white lg:min-h-[calc(100dvh-0px)] lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-3 px-4 py-4 lg:block lg:px-5 lg:py-6">
        <Link href="/admin" className="flex items-center gap-3 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-brand-700">
            O
          </span>
          <span>
            <span className="block text-base font-black">Ofissio Admin</span>
            <span className="block text-xs text-white/65">Operational foundation</span>
          </span>
        </Link>
      </div>
      <nav
        aria-label="Navigasi admin"
        className="flex gap-2 overflow-x-auto px-4 pb-4 lg:block lg:space-y-1 lg:overflow-visible lg:px-3"
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
              className={cn(
                "flex min-w-max items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold text-white/70 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:min-w-0",
                active && "bg-white text-ink shadow-soft-sm",
                !active && "hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
