"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "./AppShell";
import { storefrontFont } from "./storefront-font";
import { StorefrontThemeContext } from "./StorefrontThemeContext";

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

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <StorefrontThemeContext value={true}>
    <div className={`${storefrontFont.variable} storefront-scope min-h-full`}>
      {isLoginRoute || isCheckoutRoute ? children : <AppShell>{children}</AppShell>}
    </div>
    </StorefrontThemeContext>
  );
}
