"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { markInitialShellReady } from "./boot-readiness";

import { AppShell } from "./AppShell";
import { storefrontFont } from "./storefront-font";
import { StorefrontThemeContext } from "./StorefrontThemeContext";
import customerTheme from "./CustomerWorkspaceTheme.module.css";
import productTheme from "@/components/product/ProductDetailTheme.module.css";
import commerceTheme from "./CommercePagesTheme.module.css";

interface RouteAwareShellProps {
  children: ReactNode;
}

export function RouteAwareShell({ children }: RouteAwareShellProps) {
  useEffect(() => { markInitialShellReady(); }, []);
  const pathname = usePathname();
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLoginRoute = pathname === "/login";
  // Checkout renders as a standalone full page (its own layout carries a
  // minimal header) — exact match, there are no /checkout sub-routes.
  const isCheckoutRoute = pathname === "/checkout";
  const isCustomerRoute = pathname === "/cart" || ["/dashboard", "/orders", "/quotes"].some(route => pathname === route || pathname.startsWith(`${route}/`));

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <StorefrontThemeContext value={true}>
    <div className={`${storefrontFont.variable} storefront-scope min-h-full ${isCustomerRoute ? customerTheme.theme : ""} ${pathname.startsWith("/product/") ? productTheme.theme : ""} ${isCustomerRoute || pathname === "/promo" ? commerceTheme.theme : ""}`}>
      {isLoginRoute || isCheckoutRoute ? children : <AppShell>{children}</AppShell>}
    </div>
    </StorefrontThemeContext>
  );
}
