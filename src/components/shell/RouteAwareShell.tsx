"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "./AppShell";

interface RouteAwareShellProps {
  children: ReactNode;
}

export function RouteAwareShell({ children }: RouteAwareShellProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLoginRoute = pathname === "/login";
  // Checkout renders as a standalone full page (its own layout carries a
  // minimal header) — exact match, there are no /checkout sub-routes.
  const isCheckoutRoute = pathname === "/checkout";

  if (isAdminRoute || isLoginRoute || isCheckoutRoute) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
